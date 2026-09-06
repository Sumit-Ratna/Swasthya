const firestoreService = require('../services/firestoreService');

exports.bookOpd = async (req, res) => {
    try {
        const { symptoms, notes, doctor_id } = req.body;

        // Get all OPD appointments to calculate queue number
        const snapshot = await firestoreService.db.collection('appointments')
            .where('type', '==', 'OPD')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        const queue_number = snapshot.empty ? 1 : (snapshot.docs[0].data().queue_number || 0) + 1;

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
