const express = require("express");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Lead = require("../models/Lead");
const sendEmail = require("../services/emailService");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create Project and Accept Lead
router.post("/", protect, async (req, res) => {
    try {
        const {
            lead,
            projectName,
            description,
            service,
            contractValue,
            paidAmount,
            startDate,
            deadline,
            assignedTo
        } = req.body;

        if (!lead || !projectName || !service || contractValue === undefined) {
            return res.status(400).json({
                message: "Lead, project name, service and contract value are required"
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(lead) ||
            !Number.isFinite(Number(contractValue)) ||
            Number(contractValue) < 0 ||
            !Number.isFinite(Number(paidAmount || 0)) ||
            Number(paidAmount || 0) < 0
        ) {
            return res.status(400).json({
                message: "Invalid project data or amounts"
            });
        }

        if (Number(paidAmount || 0) > Number(contractValue)) {
            return res.status(400).json({
                message: "Paid amount cannot exceed contract value"
            });
        }

        const existingLead = await Lead.findById(lead);

        if (!existingLead) {
            return res.status(404).json({
                message: "Lead not found"
            });
        }

        if (existingLead.decision !== "Pending") {
            return res.status(409).json({
                message: "A decision has already been made for this lead"
            });
        }

        const existingProject = await Project.findOne({ lead });

        if (existingProject) {
            existingLead.status = "Won";
            existingLead.decision = "Accepted";
            existingLead.decisionAt =
                existingLead.decisionAt || new Date();

            const alreadyRecorded = existingLead.activities.some(
                (activity) => activity.action === "Lead Accepted"
            );

            if (!alreadyRecorded) {
                existingLead.activities.push({
                    action: "Lead Accepted",
                    description: `Lead accepted. Existing project "${existingProject.projectName}" was found.`,
                    createdBy: req.adminId
                });
            }

            await existingLead.save();

            return res.status(200).json({
                message: "Existing project linked and lead accepted successfully",
                project: existingProject,
                lead: existingLead,
                emailSent: false,
                alreadyExists: true
            });
        }

        const project = await Project.create({
            lead,
            projectName,
            description,
            service,
            contractValue: Number(contractValue),
            paidAmount: Number(paidAmount || 0),
            startDate: startDate || null,
            deadline: deadline || null,
            assignedTo
        });

        const oldStatus = existingLead.status;

        existingLead.status = "Won";
        existingLead.decision = "Accepted";
        existingLead.decisionAt = new Date();

        existingLead.activities.push({
            action: "Lead Accepted",
            description: `Lead accepted and project "${projectName}" was created.`,
            createdBy: req.adminId
        });

        if (oldStatus !== "Won") {
            existingLead.activities.push({
                action: "Status Changed",
                description: `Status changed from ${oldStatus} to Won after project acceptance.`,
                createdBy: req.adminId
            });
        }

        let emailSent = false;

        try {
            await sendEmail({
                to: existingLead.email,
                subject: "Your Project Request Has Been Accepted",
                text: `Hello ${existingLead.name}, your project request has been accepted. Our team will contact you soon.`,
                html: `
                    <h2>Hello ${existingLead.name},</h2>
                    <p>We are pleased to inform you that your project request has been accepted.</p>
                    <p>Our team will contact you soon with the next steps.</p>
                    <p>Our Software Company Team</p>
                `
            });

            existingLead.emailNotification.status = "Sent";
            existingLead.emailNotification.sentAt = new Date();
            existingLead.emailNotification.error = "";
            emailSent = true;

        } catch (emailError) {
            console.error("Acceptance email error:", emailError.message);

            existingLead.emailNotification.status = "Failed";
            existingLead.emailNotification.error = emailError.message;
        }

        await existingLead.save();

        res.status(201).json({
            message: "Project created and lead accepted successfully",
            project,
            lead: existingLead,
            emailSent
        });

    } catch (error) {
        console.error("Create project error:", error.message);

        res.status(400).json({
            message: "Failed to create project",
            error: error.message
        });
    }
});

// Get All Projects
router.get("/", protect, async (req, res) => {
    try {
        const projects = await Project.find()
            .populate("lead", "name email phone company")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: projects.length,
            projects
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch projects",
            error: error.message
        });
    }
});

// Get Single Project
router.get("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const project = await Project.findById(id)
            .populate("lead", "name email phone company");

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        res.status(200).json({ project });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch project",
            error: error.message
        });
    }
});


// Update Project
router.put("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }

        const allowedFields = [
            "projectName",
            "description",
            "service",
            "status",
            "contractValue",
            "paidAmount",
            "startDate",
            "deadline",
            "progress",
            "assignedTo"
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const contractValue = updates.contractValue ?? project.contractValue;
        const paidAmount = updates.paidAmount ?? project.paidAmount;

        if (paidAmount > contractValue) {
            return res.status(400).json({
                message: "Paid amount cannot exceed contract value"
            });
        }

        Object.assign(project, updates);
        await project.save();

        res.status(200).json({
            message: "Project updated successfully",
            project
        });

    } catch (error) {
        res.status(400).json({
            message: "Failed to update project",
            error: error.message
        });
    }
});

// Delete Project
router.delete("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }

        const project = await Project.findByIdAndDelete(id);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({
            message: "Project deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete project",
            error: error.message
        });
    }
});

module.exports = router;