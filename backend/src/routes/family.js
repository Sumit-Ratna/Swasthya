const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const verifyToken = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Add a family member (Step 1: Initiate request)
router.post('/add', familyController.initiateFamilyLink);

// Verify family member (Step 2: Instant password verify fallback)
router.post('/verify', familyController.verifyFamilyLink);

// Pending Connection Requests (Incoming & Outgoing)
router.get('/requests', familyController.getFamilyRequests);

// Respond to a Connection Request (Accept with permissions or Decline)
router.post('/requests/:linkId/respond', familyController.respondToFamilyRequest);

// Update document sharing permissions for a connected member
router.patch('/permissions/:memberId', familyController.updateFamilyPermissions);

// Get list of all linked family members
router.get('/list', familyController.getFamilyMembers);

// Get specific member details and documents (filtered by granted permissions)
router.get('/:memberId', familyController.getMemberDetails);

// Remove a family member
router.delete('/:memberId', familyController.removeFamilyMember);

module.exports = router;

