/*
Có 2 cấp danh mục
Điện tử ➠ Điện thoại di động
Điện tử ➠ Máy tính xách tay
Thời trang ➠ Giày
Thời trang ➠ Đồng hồ
*/

import db from "../config/db.js";

export const Category_Model = [
  {
    id: "",           // ID danh mục cha
    name: "Điện tử",  // Tên danh mục cha
    subcategories: [  // Danh mục con thuộc danh mục cha này
      {
        id: "",       // ID danh mục con
        name: "Điện thoại di động", // Tên danh mục con
      },
      {
        id: "",
        name: "Máy tính xách tay",
      },
    ],
  },
  {
    id: "",
    name: "Thời trang",
    subcategories: [
      {
        id: "",
        name: "Giày",
      },
      {
        id: "",
        name: "Đồng hồ",
      },
    ],
  },
];
