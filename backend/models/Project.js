const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true
        },

        projectName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
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

        status: {
            type: String,
            enum: [
                "Pending",
                "In Progress",
                "On Hold",
                "Review",
                "Completed",
                "Delivered"
            ],
            default: "Pending"
        },

        contractValue: {
            type: Number,
            min: 0,
            required: true
        },

        paidAmount: {
            type: Number,
            min: 0,
            default: 0
        },

        startDate: {
            type: Date,
            default: null
        },

        deadline: {
            type: Date,
            default: null
        },

        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        assignedTo: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

projectSchema.virtual("remainingAmount").get(function () {
    return this.contractValue - this.paidAmount;
});

projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;