// // 🧠 Make another user an Admin
// export const makeAdmin = async (req: Request, res: Response) => {
//     try {
//         const { email, name, password } = req.body;

//         // Ensure requester is an admin
//         const requester = (req as any).admin;
//         if (!requester || requester.role !== "admin") {
//             return res.status(403).json({ message: "Access denied. Only admin can create another admin." });
//         }

//         // Check if admin already exists
//         const existingAdmin = await Admin.findOne({ email });
//         if (existingAdmin) {
//             return res.status(400).json({ message: "Admin already exists with this email." });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newAdmin = new Admin({
//             name,
//             email,
//             password: hashedPassword,
//             role: "admin",
//         });

//         await newAdmin.save();

//         res.status(201).json({
//             message: "New admin created successfully.",
//             admin: {
//                 id: newAdmin._id,
//                 name: newAdmin.name,
//                 email: newAdmin.email,
//                 role: newAdmin.role,
//             },
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error });
//     }
// };
