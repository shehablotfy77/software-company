const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Lead = require("../models/Lead");
const Project = require("../models/Project");
const sendEmail = require("../services/emailService");
const protect = require("../middleware/authMiddleware");
router.post("/", async (req, res) => {
    console.log("Received lead body:", req.body);

    try {
        const lead = await Lead.create({
            ...req.body,

            activities: [
                {
                    action: "Lead Created",
                    description: "A new lead was submitted through the website."
                }
            ]
        });

        res.status(201).json({
            message: "Lead saved successfully",
            lead: lead,
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to save lead",
            error: error.message,
        });
    }
});


const allowedStatuses = [
    "New",
    "Contacted",
    "Interested",
    "In Progress",
    "Won",
    "Lost"
];

// Update a lead
router.put("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        const allowedFields = [
            "name",
            "email",
            "phone",
            "company",
            "service",
            "budget",
            "message",
            "status"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (
            updates.status !== undefined &&
            !allowedStatuses.includes(updates.status)
        ) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        const oldStatus = lead.status;

        // Apply allowed updates
        for (const field of Object.keys(updates)) {
            lead[field] = updates[field];
        }

        // Record status change
        if (
            updates.status !== undefined &&
            updates.status !== oldStatus
        ) {
            lead.activities.push({
                action: "Status Changed",
                description: `Status changed from ${oldStatus} to ${updates.status}`,
                createdBy: req.adminId
            });
        }

        // Record other lead updates
        else if (Object.keys(updates).length > 0) {
            lead.activities.push({
                action: "Lead Updated",
                description: "Lead information was updated",
                createdBy: req.adminId
            });
        }

        await lead.save();

        const updatedLead = lead;

        if (!updatedLead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        res.status(200).json({
            message: "Lead updated successfully",
            lead: updatedLead
        });
    } catch (error) {
        console.error("Update lead error:", error.message);

        res.status(500).json({
            message: "Server error while updating lead"
        });
    }
});


// Add a follow-up to a lead
router.post("/:id/follow-ups", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { note, outcome, contactedAt, nextFollowUpAt } = req.body;

        // Validate lead ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        // Validate required fields
        if (!note || !outcome) {
            return res.status(400).json({
                message: "Note and outcome are required"
            });
        }

        // Find the lead
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        // Add follow-up record
        lead.followUps.push({
            note,
            outcome,
            contactedAt,
            nextFollowUpAt: nextFollowUpAt || null,
            createdBy: req.adminId
        });

        // Add activity record
        lead.activities.push({
            action: "Follow-up Added",
            description: `Follow-up added. Outcome: ${outcome}. Note: ${note}`,
            createdBy: req.adminId
        });

        await lead.save();

        // Populate admin information
        await lead.populate("followUps.createdBy", "name email");
        await lead.populate("activities.createdBy", "name email");

        res.status(201).json({
            message: "Follow-up added successfully",
            lead
        });

    } catch (error) {
        console.error("Add follow-up error:", error.message);

        res.status(400).json({
            message: "Failed to add follow-up",
            error: error.message
        });
    }
});

// Mark a follow-up as completed
router.patch("/:id/follow-ups/:followUpId/complete", protect, async (req, res) => {
    try {
        const { id, followUpId } = req.params;

        // Validate IDs
        if (
            !mongoose.Types.ObjectId.isValid(id) ||
            !mongoose.Types.ObjectId.isValid(followUpId)
        ) {
            return res.status(400).json({
                message: "Invalid lead ID or follow-up ID"
            });
        }

        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        const followUp = lead.followUps.id(followUpId);

        if (!followUp) {
            return res.status(404).json({
                message: "Follow-up not found"
            });
        }

        if (followUp.completed) {
            return res.status(400).json({
                message: "Follow-up is already completed"
            });
        }

        followUp.completed = true;

        await lead.save();

        await lead.populate("followUps.createdBy", "name email");
        await lead.populate("activities.createdBy", "name email");

        res.status(200).json({
            message: "Follow-up marked as completed",
            lead
        });

    } catch (error) {
        console.error("Complete follow-up error:", error.message);

        res.status(500).json({
            message: "Failed to complete follow-up"
        });
    }
});



// Reject a Lead
router.patch("/:id/decision", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { decision } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }

        if (decision !== "Rejected") {
            return res.status(400).json({ message: "Only rejection is allowed here" });
        }

        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        if (lead.decision !== "Pending") {
            return res.status(409).json({
                message: "A decision has already been made for this lead"
            });
        }

        lead.decision = "Rejected";
        lead.decisionAt = new Date();
        lead.status = "Lost";

        lead.activities.push({
            action: "Lead Rejected",
            description: "Lead request was rejected.",
            createdBy: req.adminId
        });

        await lead.save();

        let emailSent = false;

        try {
            await sendEmail({
                to: lead.email,
                subject: "Update About Your Project Request",
                text: `Hello ${lead.name}, thank you for your request. Unfortunately, we cannot accept your project at this time.`,
                html: `
                    <h2>Hello ${lead.name},</h2>
                    <p>Thank you for your interest. Unfortunately, we cannot accept your project at this time.</p>
                    <p>Our Software Company Team</p>
                `
            });

            lead.emailNotification.status = "Sent";
            lead.emailNotification.sentAt = new Date();
            lead.emailNotification.error = "";
            emailSent = true;

        } catch (emailError) {
            console.error("Decision email error:", emailError.message);

            lead.emailNotification.status = "Failed";
            lead.emailNotification.error = emailError.message;
        }

        await lead.save();

        res.status(200).json({
            message: "Lead rejected successfully",
            lead,
            emailSent
        });

    } catch (error) {
        console.error("Lead rejection error:", error.message);

        res.status(500).json({
            message: "Failed to reject lead"
        });
    }
});

///dashboard
router.get("/dashboard/stats", protect, async (req, res) => {
    try {
        const statuses = [
            "New",
            "Contacted",
            "Interested",
            "In Progress",
            "Won",
            "Lost"
        ];

        const totalLeads = await Lead.countDocuments();

        const counts = await Lead.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            totalLeads,
            New: 0,
            Contacted: 0,
            Interested: 0,
            "In Progress": 0,
            Won: 0,
            Lost: 0
        };

        counts.forEach((item) => {
            if (statuses.includes(item._id)) {
                stats[item._id] = item.count;
            }
        });

        res.status(200).json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error.message);

        res.status(500).json({
            message: "Server error while fetching dashboard stats"
        });
    }
});






router.delete("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        const deletedLead = await Lead.findByIdAndDelete(id);

        if (!deletedLead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        res.status(200).json({
            message: "Lead deleted successfully",
            lead: deletedLead
        });
    } catch (error) {
        console.error("Delete lead error:", error.message);

        res.status(500).json({
            message: "Server error while deleting lead"
        });
    }
});






// Get one lead by ID
router.get("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid lead ID"
            });
        }

        const lead = await Lead.findById(id)
            .populate("followUps.createdBy", "name email")
            .populate("activities.createdBy", "name email");

        if (!lead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        res.status(200).json({
            lead: lead
        });
    } catch (error) {
        console.error("Get lead error:", error.message);

        res.status(500).json({
            message: "Server error while fetching lead"
        });
    }
});




// Get all leads with search and filter
router.get("/", protect, async (req, res) => {
    try {
        const { search, status } = req.query;

        // Build the search filter
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } }
            ];
        }

        // Filter by status
        if (status) {
            const allowedStatuses = [
                "New",
                "Contacted",
                "Interested",
                "In Progress",
                "Won",
                "Lost"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status"
                });
            }

            filter.status = status;
        }

        // Get matching leads, newest first
        const leads = await Lead.find(filter)
            .populate("followUps.createdBy", "name email")
            .populate("activities.createdBy", "name email")
            .sort({ created_at: -1 });

        res.status(200).json({
            count: leads.length,
            leads: leads
        });
    } catch (error) {
        console.error("Get leads error:", error.message);

        res.status(500).json({
            message: "Server error while fetching leads"
        });
    }
});


module.exports = router;


