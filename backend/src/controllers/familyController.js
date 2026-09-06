const bcrypt = require('bcryptjs');
const firestoreService = require('../services/firestoreService');

// ---------------------------------------------------------------------------
// POST /api/family/add — Step 1: Initiate family link
// ---------------------------------------------------------------------------
exports.initiateFamilyLink = async (req, res) => {
    try {
        const { phone, relation } = req.body;
        const userId = req.user.id;

        console.log(`[FAMILY] Init Link: User ${userId} -> Phone ${phone}`);

        // Find target user by phone
        const member = await firestoreService.getUserByPhone(phone);
        if (!member) {
            console.log('[ERROR] Target user not found for phone:', phone);
            return res.status(404).json({ error: 'User not found.' });
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
                    link: existingLink
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
// password. Accepts { phone, password } where phone+password belongs to the
// family member (the person being added), not the initiator.
// ---------------------------------------------------------------------------
exports.verifyFamilyLink = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const userId = req.user.id; // the initiator

        console.log(`[FAMILY] Verify Link: Initiator ${userId}, MemberPhone ${phone}`);

        if (!phone || !password) {
            return res.status(400).json({ error: 'phone and password are required.' });
        }

        // Find member by phone
        const member = await firestoreService.getUserByPhone(phone);
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
            console.log(`[ERROR] No pending link found from phone ${phone} (${member.id}) to user ${userId}`);
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
        res.json({ message: 'Family link verified successfully.' });
    } catch (err) {
        console.error('[FAMILY] Verify error:', err);
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
        const documents = await firestoreService.getDocumentsByPatient(memberId);

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
            relation: link.relation
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

        await firestoreService.db.collection('familyLinks').doc(link.id).delete();

        res.json({ message: 'Family member removed successfully.' });
    } catch (err) {
        console.error('[FAMILY] Remove member error:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
