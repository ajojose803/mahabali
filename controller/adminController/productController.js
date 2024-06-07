const asyncHandler = require('../../middleware/asyncHandler');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coaster = require('../../model/productModels/coasterModel');
const Accessory = require('../../model/productModels/accesoriesModel');
const Poster = require('../../model/productModels/posterModel');
const Apparels = require('../../model/productModels/apparelModel');
const sharp = require('sharp');
const { uploadFile, getObjectSignedUrl } = require('../../utils/s3');

const ITEMS_PER_PAGE = 8;

const loadProduct = asyncHandler(async (req, res) => {
  let page = +req.query.page || 1;
  const totalProducts = await Product.countDocuments();
  const totalPages = Math.max(Math.ceil(totalProducts / ITEMS_PER_PAGE), 1);
  const skipAmount = Math.max(0, (page - 1) * ITEMS_PER_PAGE);

  const products = await Product.find()
    .skip(skipAmount)
    .limit(ITEMS_PER_PAGE)
    .populate('category');

  for (const product of products) {
    product.imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
  }

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const category = await Category.find({});
  const msg = req.query.msg || "";

  res.render("admin/adminProduct", {
    data: products,
    prev,
    next,
    totalPages,
    currentPage: page,
    CatData: category,
    msg,
  });
});

const loadAddProduct = asyncHandler(async (req, res) => {
  const category = await Category.find({});
  res.render('admin/adminProduct-add', { data: category });
});

const addNewProduct = asyncHandler(async (req, res) => {
  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  // Upload images
  const files = req.files;
  const uploadedImages = await Promise.all(files.map(async file => {
    const resizedImageBuffer = await sharp(file.buffer)
      .resize({ width: 500, height: 500, fit: "contain" })
      .toBuffer();
    const imageName = Date.now() + "-" + file.originalname;
    await uploadFile(resizedImageBuffer, imageName, file.mimetype);
    return imageName;
  }));

  // Extract product data from request body
  const { name, description,aboutProduct, price, category, discount, color, material, type, dimensions } = req.body;

  // Find selected category
  const selectedCategory = await Category.findById(category);

  let newProduct;

  // Parse stock based on category
  let parsedStock;
  switch (selectedCategory.name) {
    case 'Coasters':
    case 'Accessories':
    case 'Posters':
      // For Coasters, Accessories, and Posters, stock is a single quantity
      parsedStock = parseInt(req.body.stock, 10);
      if (isNaN(parsedStock)) {
        return res.status(400).send("Invalid stock value.");
      }
      break;
    case 'Apparels':
      // For Apparels, stock is an object with sizes as keys and quantities as values
      parsedStock = {};
      for (const [size, quantity] of Object.entries(req.body.sizes)) {
        parsedStock[size] = parseInt(quantity, 10);
        if (isNaN(parsedStock[size])) {
          return res.status(400).send("Invalid stock value.");
        }
      }
      break;
    default:
      return res.status(400).send("Invalid category type.");
  }

  // Create new product instance based on category
  switch (selectedCategory.name) {
    case 'Coasters':
      newProduct = new Coaster({ 
        name, 
        description,
        aboutProduct,
        price, 
        category, 
        discount, 
        color, 
        stock: parsedStock, 
        image: uploadedImages, 
        material 
      });
      break;
    case 'Accessories':
      newProduct = new Accessory({ 
        name, 
        description,
        aboutProduct,
        price, 
        category, 
        discount, 
        color, 
        stock: parsedStock, 
        image: uploadedImages, 
        type 
      });
      break;
    case 'Posters':
      newProduct = new Poster({ 
        name, 
        description,
        aboutProduct,
        price, 
        category, 
        discount, 
        color, 
        stock: parsedStock, 
        image: uploadedImages, 
        dimensions 
      });
      break;
    case 'Apparels':
      newProduct = new Apparels({
        name,
        description,
        aboutProduct,
        price,
        category,
        discount,
        color,
        sizes: parsedStock,
        image: uploadedImages,
        material,
      });
      break;
    default:
      return res.status(400).send("Invalid category type.");
  }

  // Save the new product
  await newProduct.save();
  res.redirect("/admin/products");
});

module.exports = {
  loadProduct,
  loadAddProduct,
  addNewProduct,
};
