/*
Được 
phép đánh giá người bán  like(+1) hoặc  dislike(-1),
gửi kèm 1 đoạn nhận xét */

import db from "../config/db.js";

const ratings = {
  id:"",
  order_id:"",
  rater_id:"",
  target_user_id:"",
  score:[1,-1],
  comment:"",
  created_at:"",
};
