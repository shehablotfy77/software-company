

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin.js");

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            throw new Error(
                "Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env"
            );
        }

        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            console.log("Admin account already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await Admin.create({
            name: "Admin",
            email,
            password: hashedPassword
        });

        console.log("Admin account created successfully");
    } catch (error) {
        console.error("Error:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
