require('dotenv').config();
const { uploadFile } = require('@huggingface/hub');
const fs = require('fs');
const path = require('path');

async function syncToHuggingFace() {
    console.log("================================================");
    console.log("   DEEPQUANT AI: HUGGING FACE PARQUET SYNC      ");
    console.log("================================================\n");

    const HF_TOKEN = process.env.HF_TOKEN;
    const HF_DATASET_NAME = process.env.HF_DATASET_NAME;

    if (!HF_TOKEN || !HF_DATASET_NAME) {
        console.error("❌ Error: Missing HF_TOKEN or HF_DATASET_NAME in your environment variables.");
        console.error("Please create a `.env` file in the root directory with:");
        console.error("HF_TOKEN=hf_your_secret_write_token");
        console.error("HF_DATASET_NAME=your_username/your_dataset_name");
        process.exit(1);
    }

    const parquetDir = path.join(__dirname, 'data', 'parquet');

    if (!fs.existsSync(parquetDir)) {
        console.error(`❌ Error: Could not find Parquet directory at ${parquetDir}`);
        console.error(`Make sure you have run the sync_all_fno.js script first.`);
        process.exit(1);
    }

    // Read all parquet files
    const allFiles = fs.readdirSync(parquetDir);
    const parquetFiles = allFiles.filter(f => f.endsWith('.parquet'));

    if (parquetFiles.length === 0) {
        console.log("⚠️  No .parquet files found in the directory to upload.");
        process.exit(0);
    }

    console.log(`Found ${parquetFiles.length} Parquet files to synchronize to: https://huggingface.co/datasets/${HF_DATASET_NAME}\n`);

    let successCount = 0;

    // Upload files sequentially to avoid overriding RAM limits
    for (let i = 0; i < parquetFiles.length; i++) {
        const file = parquetFiles[i];
        const filePath = path.join(parquetDir, file);
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        process.stdout.write(`[${i + 1}/${parquetFiles.length}] Uploading ${file} (${fileSizeMB} MB)... `);

        try {
            await uploadFile({
                repo: { type: "dataset", name: HF_DATASET_NAME },
                credentials: { accessToken: HF_TOKEN },
                file: {
                    path: file, // Destination path in HF repo
                    content: () => fs.createReadStream(filePath) // Stream it to keep RAM usage extremely low
                }
            });

            console.log("✅ Custom Sync Success");
            successCount++;
        } catch (e) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }

    console.log("\n================================================");
    console.log(`🎉 SYNC COMPLETE! Uploaded ${successCount}/${parquetFiles.length} files to Hugging Face Cloud.`);
    console.log("================================================");
}

syncToHuggingFace();
