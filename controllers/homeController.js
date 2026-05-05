const Category = require("../models/Category");
const Case = require("../models/Case");

exports.getHomeData = async (req, res) => {
  try {
    const language = req.query.lang || "en";

    const categories = await Category.find({ isActive: true }).sort({ order: 1 });

    const data = await Promise.all(
      categories.map(async (category) => {
        const cases = await Case.find({
          category: category._id,
          status: "active",
        })
          .sort({ isFeatured: -1, createdAt: -1 })
          .limit(6);

        return {
          _id: category._id,
          name: language === "ar" ? category.nameAr : category.name,
          cases: cases.map((c) => ({
            _id: c._id,
            title: language === "ar" ? c.titleAr : c.title,
            image: c.image,
            goalAmount: c.goalAmount,
            currentAmount: c.currentAmount,
          })),
        };
      })
    );

    res.status(200).json({ success: true, data: { categories: data } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};