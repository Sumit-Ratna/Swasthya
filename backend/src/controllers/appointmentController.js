const firestoreService = require('../services/firestoreService');

exports.bookOpd = async (req, res) => {
    try {
        const { symptoms, notes, doctor_id } = req.body;

        // Count existing OPD appointments to derive next queue number.
        // Using a simple where-only query avoids the need for a composite index.
        const snapshot = await firestoreService.db.collection('appointments')
            .where('type', '==', 'OPD')
            .get();

        const queue_number = snapshot.size + 1;

        const appointment = await firestoreService.createAppointment({
            patient_id: req.user.id,
            doctor_id: doctor_id || null,
            type: 'OPD',
            status: 'CONFIRMED',
            appointment_date: new Date().toISOString(),
            queue_number,
            symptoms: symptoms || '',
            notes: notes || ''
        });

        // Trigger in-app notification reminder
        try {
            await firestoreService.createNotification({
                user_id: req.user.id,
                title: 'OPD Queue Ticket Issued',
                message: `Your OPD queue number #${queue_number} is confirmed. Estimated wait: ${queue_number * 5} mins.`,
                type: 'opd',
                link: '/status'
            });
        } catch (notifErr) {
            console.warn('[NOTIFICATIONS] Could not create OPD notification:', notifErr.message);
        }

        res.json({ message: "OPD Booking Confirmed", appointment });
    } catch (err) {
        console.error('[APPOINTMENT] Booking failed:', err);
        res.status(500).json({ error: "Booking Failed" });
    }
};

exports.bookScheduled = async (req, res) => {
    try {
        const { doctor_id, appointment_date, appointment_time, type, symptoms, notes } = req.body;

        if (!doctor_id) {
            return res.status(400).json({ error: "doctor_id is required" });
        }
        if (!appointment_date) {
            return res.status(400).json({ error: "appointment_date is required" });
        }

        const doctor = await firestoreService.getUser(doctor_id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ error: "Doctor not found" });
        }

        const validTypes = ['Consultation', 'Follow-up', 'Routine Checkup', 'Specialist Review'];
        const appointmentType = validTypes.includes(type) ? type : (type || 'Consultation');
        const slotTime = appointment_time || '10:00 AM';

        const appointment = await firestoreService.createAppointment({
            patient_id: req.user.id,
            doctor_id,
            type: appointmentType,
            status: 'CONFIRMED',
            appointment_date,
            appointment_time: slotTime,
            slot_time: slotTime,
            symptoms: symptoms || '',
            notes: notes || ''
        });

        // Trigger in-app notification reminder for patient & doctor
        try {
            await firestoreService.createNotification({
                user_id: req.user.id,
                title: 'Appointment Scheduled',
                message: `Your ${appointmentType} with Dr. ${doctor.name} is confirmed for ${appointment_date} at ${slotTime}.`,
                type: 'appointment',
                link: '/status'
            });
            await firestoreService.createNotification({
                user_id: doctor_id,
                title: 'New Scheduled Appointment',
                message: `Patient ${req.user.name || 'Patient'} booked a ${appointmentType} on ${appointment_date} at ${slotTime}.`,
                type: 'appointment',
                link: '/doctor/dashboard'
            });
        } catch (notifErr) {
            console.warn('[NOTIFICATIONS] Could not create scheduled notification:', notifErr.message);
        }

        res.status(201).json({
            message: "Scheduled Appointment Confirmed",
            appointment: {
                ...appointment,
                doctor: {
                    id: doctor.id,
                    name: doctor.name,
                    specialization: doctor.specialization,
                    hospital_name: doctor.hospital_name
                }
            }
        });
    } catch (err) {
        console.error('[APPOINTMENT] Scheduled booking failed:', err);
        res.status(500).json({ error: "Booking Failed: " + err.message });
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await firestoreService.getAppointmentsByPatient(req.user.id);

        // Enrich with doctor information
        const enrichedAppointments = [];
        for (const apt of appointments) {
            const enriched = { ...apt };
            if (apt.doctor_id) {
                const doctor = await firestoreService.getUser(apt.doctor_id);
                if (doctor) {
                    enriched.doctor = { name: doctor.name };
                }
            }
            enrichedAppointments.push(enriched);
        }

        res.json(enrichedAppointments);
    } catch (err) {
        console.error('[APPOINTMENT] Fetch failed:', err);
        res.status(500).json({ error: "Fetch Failed" });
    }
};

module.exports = exports;
