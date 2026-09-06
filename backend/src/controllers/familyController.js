const bcrypt = require('bcryptjs');
const firestoreService = require('../services/firestoreService');

// ---------------------------------------------------------------------------
// POST /api/family/add — Step 1: Initiate family link
// ---------------------------------------------------------------------------
exports.initiateFamilyLink = async (req, res) => {
    try {
        const { phone, email, identifier, relation } = req.body;
        const targetIdentifier = (identifier || email || phone || '').trim();
        const userId = req.user.id;

        console.log(`[FAMILY] Init Link: User ${userId} -> Identifier ${targetIdentifier}`);

        if (!targetIdentifier) {
            return res.status(400).json({ error: 'Phone number or email is required.' });
        }

        // Find target user by phone or email
        const member = await firestoreService.getUserByIdentifier(targetIdentifier);
        if (!member) {
            console.log('[ERROR] Target user not found for identifier:', targetIdentifier);
            return res.status(404).json({ error: 'User not found. Make sure they are registered on HealthNexus.' });
        }
        console.log(`[SUCCESS] Found Target Member: ${member.id} (${member.name})`);

        if (member.id === userId) {
            return res.status(400).json({ error: 'Cannot add yourself.' });
        }

        // Check if already connected
        const existingLink = await firestoreService.getFamilyLink(userId, member.id);

        if (existingLink) {
            console.log(`[WARNING] Existing link found: Status ${existingLink.status}`);

            if (existingLink.status === 'active') {
                return res.status(409).json({ error: 'Already connected.' });
            }

            if (existingLink.status === 'pending') {
                // Update timestamp
                await firestoreService.updateFamilyLink(existingLink.id, {
                    createdAt: new Date()
                });
                console.log('[SYNC] Updated existing pending link timestamp');
                return res.json({
                    message: 'Link request sent (updated timestamp).',
                    link: existingLink,
                    member_name: member.name
                });
            }
        }

        // Create new pending link
        const newLink = await firestoreService.createFamilyLink({
            user_id: userId,
            family_member_id: member.id,
            relation: relation || 'family',
            status: 'pending'
        });

        console.log(`[SUCCESS] Created Pending Link: ID ${newLink.id}`);

        // Send in-app notification to member if available
        try {
            const initiator = await firestoreService.getUser(userId);
            await firestoreService.createNotification({
                user_id: member.id,
                title: 'Family Link Request',
                body: `${initiator?.name || 'A family member'} added you as a family member.`,
                type: 'family_request'
            });
        } catch (notifErr) {
            console.warn('[FAMILY] Notification error (non-fatal):', notifErr.message);
        }

        res.json({
            message: 'Family link request sent. Ask the member to verify using their password.',
            link_id: newLink.id,
            member_name: member.name
        });
    } catch (err) {
        console.error('[FAMILY] Init error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/family/verify — Step 2: Confirm family link
//
// The INITIATOR calls this endpoint after the family member shares their
// password. Accepts { identifier, phone, password } where identifier/phone +
// password belongs to the family member (the person being added), not the initiator.
// ---------------------------------------------------------------------------
exports.verifyFamilyLink = async (req, res) => {
    try {
        const { phone, email, identifier, password } = req.body;
        const targetIdentifier = (identifier || email || phone || '').trim();
        const userId = req.user.id; // the initiator

        console.log(`[FAMILY] Verify Link: Initiator ${userId}, MemberIdentifier ${targetIdentifier}`);

        if (!targetIdentifier || !password) {
            return res.status(400).json({ error: 'Phone/email and password are required.' });
        }

        // Find member by phone or email
        const member = await firestoreService.getUserByIdentifier(targetIdentifier);
        if (!member) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Verify the family member's password
        if (!member.password_hash) {
            return res.status(401).json({ error: 'Member account has no password set.' });
        }

        const passwordMatch = await bcrypt.compare(password, member.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Incorrect password for that member.' });
        }

        console.log(`[SUCCESS] Password verified for member: ${member.id}`);

        // Find pending link (Initiator: userId, Target: member.id)
        const pendingLink = await firestoreService.getFamilyLink(userId, member.id);

        if (!pendingLink) {
            console.log(`[ERROR] No pending link found from identifier ${targetIdentifier} (${member.id}) to user ${userId}`);
            return res.status(404).json({ error: 'No pending link found. Did you initiate the link first?' });
        }

        if (pendingLink.status === 'active') {
            console.log('[WARNING] Link is already active.');
            return res.json({ message: 'Link already active.', link: pendingLink });
        }

        console.log(`[SUCCESS] Found Pending Link: ${pendingLink.id}. Activating...`);

        // Activate link
        await firestoreService.updateFamilyLink(pendingLink.id, {
            status: 'active',
            verified_at: new Date()
        });

        console.log('[SUCCESS] Link Activated.');

        // Send confirmation notification
        try {
            const initiator = await firestoreService.getUser(userId);
            await firestoreService.createNotification({
                user_id: member.id,
                title: 'Family Link Connected',
                body: `You are now connected with ${initiator?.name || 'family member'}.`,
                type: 'family_connected'
            });
        } catch (notifErr) {}

        res.json({ message: 'Family link verified successfully.' });
    } catch (err) {
        console.error('[FAMILY] Verify error:', err);
        res.status(500).json({ error: err.message });
    }
};


// ---------------------------------------------------------------------------
// GET /api/family/requests — Incoming & Outgoing pending requests
// ---------------------------------------------------------------------------
exports.getFamilyRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const incoming = await firestoreService.getPendingFamilyRequests(userId);
        const outgoing = await firestoreService.getOutgoingFamilyRequests(userId);
        res.json({ incoming, outgoing });
    } catch (err) {
        console.error('[FAMILY] Get requests error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/family/requests/:linkId/respond — Accept or Decline a request
// ---------------------------------------------------------------------------
exports.respondToFamilyRequest = async (req, res) => {
    try {
        const { linkId } = req.params;
        const { action, access_level, allowed_document_ids } = req.body;
        const userId = req.user.id;

        console.log(`[FAMILY] Respond to Request ${linkId} by User ${userId}: Action ${action}, AccessLevel ${access_level}`);

        const link = await firestoreService.getFamilyLinkById(linkId);
        if (!link) {
            return res.status(404).json({ error: 'Connection request not found.' });
        }

        // Only the target member (family_member_id) can accept/reject the request
        if (link.family_member_id !== userId) {
            return res.status(403).json({ error: 'You are not authorized to respond to this request.' });
        }

        if (link.status === 'active') {
            return res.status(409).json({ error: 'Connection is already active.' });
        }

        if (action === 'reject') {
            await firestoreService.deleteFamilyLink(linkId);

            // Notify initiator
            try {
                const responder = await firestoreService.getUser(userId);
                await firestoreService.createNotification({
                    user_id: link.user_id,
                    title: 'Family Connection Declined',
                    body: `${responder?.name || 'A family member'} declined your connection request.`,
                    type: 'family_declined'
                });
            } catch (nErr) {}

            return res.json({ message: 'Family connection request declined.' });
        }

        if (action === 'accept') {
            const validAccess = ['full', 'selected', 'none'].includes(access_level) ? access_level : 'full';
            const docIds = Array.isArray(allowed_document_ids) ? allowed_document_ids : [];

            const currentPermissions = link.permissions || {};
            currentPermissions[userId] = {
                access_level: validAccess,
                allowed_document_ids: validAccess === 'selected' ? docIds : [],
                updatedAt: new Date().toISOString()
            };

            await firestoreService.updateFamilyLink(linkId, {
                status: 'active',
                verified_at: new Date(),
                permissions: currentPermissions
            });

            // Notify initiator
            try {
                const responder = await firestoreService.getUser(userId);
                await firestoreService.createNotification({
                    user_id: link.user_id,
                    title: 'Family Connection Accepted',
                    body: `${responder?.name || 'A family member'} accepted your family connection request.`,
                    type: 'family_accepted'
                });
            } catch (nErr) {}

            return res.json({
                message: 'Family connection accepted successfully.',
                permissions: currentPermissions[userId]
            });
        }

        return res.status(400).json({ error: "Invalid action. Must be 'accept' or 'reject'." });
    } catch (err) {
        console.error('[FAMILY] Respond request error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/family/permissions/:memberId — Update sharing permissions for a member
// ---------------------------------------------------------------------------
exports.updateFamilyPermissions = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { access_level, allowed_document_ids } = req.body;
        const userId = req.user.id;

        const validAccess = ['full', 'selected', 'none'].includes(access_level) ? access_level : 'full';
        const docIds = Array.isArray(allowed_document_ids) ? allowed_document_ids : [];

        let link = await firestoreService.getFamilyLink(userId, memberId);
        if (!link) {
            link = await firestoreService.getFamilyLink(memberId, userId);
        }

        if (!link || link.status !== 'active') {
            return res.status(404).json({ error: 'Active family connection not found.' });
        }

        const permissions = link.permissions || {};
        permissions[userId] = {
            access_level: validAccess,
            allowed_document_ids: validAccess === 'selected' ? docIds : [],
            updatedAt: new Date().toISOString()
        };

        await firestoreService.updateFamilyLink(link.id, {
            permissions
        });

        res.json({
            message: 'Sharing permissions updated successfully.',
            permissions: permissions[userId]
        });
    } catch (err) {
        console.error('[FAMILY] Update permissions error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/family/list
// ---------------------------------------------------------------------------
exports.getFamilyMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const members = await firestoreService.getFamilyMembers(userId);
        res.json(members);
    } catch (err) {
        console.error('[FAMILY] Get members error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/family/:memberId
// ---------------------------------------------------------------------------
exports.getMemberDetails = async (req, res) => {
    try {
        const { memberId } = req.params;
        const userId = req.user.id;

        console.log(`[FAMILY] Fetching details for member: ${memberId} by user: ${userId}`);

        // Verify family link (Check both directions)
        let link = await firestoreService.getFamilyLink(userId, memberId);
        if (!link) {
            link = await firestoreService.getFamilyLink(memberId, userId);
        }

        if (!link || link.status !== 'active') {
            return res.status(403).json({ error: 'Not connected to this member.' });
        }

        const member = await firestoreService.getUser(memberId);
        if (!member) {
            return res.status(404).json({ error: 'Member not found.' });
        }

        // Get member's documents
        let documents = await firestoreService.getDocumentsByPatient(memberId);

        // Filter documents based on permissions granted by memberId to userId
        const permissions = link.permissions || {};
        const memberPerm = permissions[memberId] || { access_level: 'full', allowed_document_ids: [] };
        const accessLevel = memberPerm.access_level || 'full';

        if (accessLevel === 'none') {
            documents = [];
        } else if (accessLevel === 'selected') {
            const allowedSet = new Set(memberPerm.allowed_document_ids || []);
            documents = documents.filter(doc => allowedSet.has(doc.id));
        }

        // Get member's appointments
        const appointments = await firestoreService.getAppointmentsByPatient(memberId);

        res.json({
            member: {
                id: member.id,
                name: member.name,
                phone: member.phone,
                dob: member.dob,
                gender: member.gender,
                blood_group: member.blood_group,
                medical_history: member.medical_history,
                lifestyle: member.lifestyle
            },
            documents,
            appointments,
            relation: link.relation,
            access_level: accessLevel
        });
    } catch (err) {
        console.error('[FAMILY] Get member details error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/family/:memberId
// ---------------------------------------------------------------------------
exports.removeFamilyMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const userId = req.user.id;

        console.log(`[FAMILY] Removing link between user: ${userId} and member: ${memberId}`);

        // Find the link (Check both directions)
        let link = await firestoreService.getFamilyLink(userId, memberId);

        if (!link) {
            link = await firestoreService.getFamilyLink(memberId, userId);
        }

        if (!link) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        await firestoreService.deleteFamilyLink(link.id);

        res.json({ message: 'Family member removed successfully.' });
    } catch (err) {
        console.error('[FAMILY] Remove member error:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;

