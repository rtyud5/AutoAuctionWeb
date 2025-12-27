import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

console.log("🧪 Testing Cloudinary Connection...\n");

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  try {
    console.log("📋 Configuration:");
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(
      `   API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 6)}...`
    );
    console.log(
      `   API Secret: ${
        process.env.CLOUDINARY_API_SECRET ? "***configured***" : "NOT SET"
      }\n`
    );

    // Test API connection by getting account usage
    console.log("🔌 Testing API connection...");
    const result = await cloudinary.api.usage();

    console.log("✅ Successfully connected to Cloudinary!\n");
    console.log("📊 Account Information:");
    console.log(`   Plan: ${result.plan || "Free"}`);
    console.log(
      `   Credits Used: ${result.credits?.usage || 0} / ${
        result.credits?.limit || "Unlimited"
      }`
    );
    console.log(
      `   Bandwidth Used: ${(result.bandwidth?.usage / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(
      `   Storage Used: ${(result.storage?.usage / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`   Resources: ${result.resources || 0} files`);
    console.log(`   Transformations: ${result.transformations?.usage || 0}\n`);

    console.log("🎉 Cloudinary is ready to use!");
    console.log('📁 Images will be uploaded to folder: "auction-products"');
  } catch (error) {
    console.error("❌ Cloudinary connection failed!\n");
    console.error("Error:", error.message);

    if (error.error?.message) {
      console.error("Details:", error.error.message);
    }

    console.error("\n💡 Please check:");
    console.error("   1. CLOUDINARY_CLOUD_NAME is correct");
    console.error("   2. CLOUDINARY_API_KEY is correct");
    console.error("   3. CLOUDINARY_API_SECRET is correct");
    console.error("   4. Your internet connection");

    process.exit(1);
  }
}

testCloudinary();
