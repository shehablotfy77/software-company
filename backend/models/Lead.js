const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
    {
        note: {
            type: String,
            required: true,
            trim: true,
            maxlength: [1000, "Note cannot exceed 1000 characters"]
        },

        outcome: {
            type: String,
            required: true,
            enum: [
                "No Answer",
                "Spoke to Client",
                "Interested",
                "Not Interested",
                "Callback Requested",
                "Meeting Scheduled"
            ]
        },

        contactedAt: {
            type: Date,
            default: Date.now
        },

        nextFollowUpAt: {
            type: Date,
            default: null
        },

        completed: {
            type: Boolean,
            default: false
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const activitySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                "Lead Created",
                "Status Changed",
                "Follow-up Added",
                "Project Created",
                "Lead Updated",
                "Lead Rejected",
                "Lead Accepted"
            ]
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null
        }
    },
    {
        timestamps: true
    }
);

const leadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email"
            ]
        },


        phone: {
            type: String,
            required: [true, "Phone is required"],
            trim: true,
            match: [
                /^[0-9+\-\s()]{8,20}$/,
                "Please enter a valid phone number"
            ]
        },

        company: {
            type: String,
            trim: true,
            maxlength: [100, "Company name cannot exceed 100 characters"]
        },

        service: {
            type: String,
            required: true,
            enum: [
                "Web Development",
                "Mobile App",
                "E-Commerce",
                "UI/UX Design",
                "Digital Marketing",
                "Other"
            ]
        },

        budget: {
            type: String,
            enum: [
                "Less than 10,000",
                "10,000 - 25,000",
                "25,000 - 50,000",
                "50,000+",
                "Not Sure"
            ]
        },

        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
            minlength: [10, "Message must be at least 10 characters"],
            maxlength: [1000, "Message cannot exceed 1000 characters"]
        },

        decision: {
            type: String,
            enum: ["Pending", "Accepted", "Rejected"],
            default: "Pending"
        },

        decisionAt: {
            type: Date,
            default: null
        },

        emailNotification: {
            status: {
                type: String,
                enum: ["Not Sent", "Sent", "Failed"],
                default: "Not Sent"
            },
            sentAt: {
                type: Date,
                default: null
            },
            error: {
                type: String,
                default: ""
            }
        },

        status: {
            type: String,
            enum: [
                "New",
                "Contacted",
                "Interested",
                "In Progress",
                "Won",
                "Lost"
            ],
            default: "New"
        },



        followUps: {
            type: [followUpSchema],
            default: []
        },
        activities: {
            type: [activitySchema],
            default: []
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;