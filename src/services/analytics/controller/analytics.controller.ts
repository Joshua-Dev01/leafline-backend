// // controllers/analytics.controller.ts
// import { Request, Response } from "express";
// import { Blog } from "../../blog/createBlog/models/blog.model";

// export const getMonthlyBlogStats = async (req: Request, res: Response) => {
//   try {
//     const stats = await Blog.aggregate([
//       {
//         $group: {
//           _id: { $month: "$createdAt" },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $sort: { _id: 1 },
//       },
//     ]);

//     const months = [
//       "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
//     ];

//     const formatted = stats.map((s) => ({
//       month: months[s._id - 1],
//       blogs: s.count,
//     }));

//     res.status(200).json({ success: true, data: formatted });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to get stats", error: err });
//   }
// };
