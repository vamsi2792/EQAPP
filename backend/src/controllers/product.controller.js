// const Product = require("../models/Product");
// const { bucket } = require("../config/firebase");

// // 🔹 Get all products
// exports.getProducts = async (req, res) => {
//   const products = await Product.find();
//   res.json(products);
// };

// // 🔹 Get secure PDF access
// exports.getProductAccess = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);

//     // 🛑 Membership check
//     if (product.isPremium && req.user.role !== "member" && req.user.role !== "gm") {
//       return res.status(403).json({ message: "Membership required" });
//     }

//     // 🔐 Generate signed URL (expires)
//     const file = bucket.file(product.filePath);

//     const [url] = await file.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 1000 * 60 * 10, // 10 min
//     });

//     res.json({ fileUrl: url });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };