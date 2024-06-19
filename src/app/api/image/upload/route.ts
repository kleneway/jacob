import { type NextRequest, NextResponse } from "next/server";
import {
  getSignedUrl,
  resizeImageForGptVision,
  uploadToS3,
  IMAGE_TYPE,
} from "~/server/utils/images";

const bucketName = process.env.BUCKET_NAME ?? "";

interface Body {
  images: {
    image: string;
    imageType: string;
    imageName?: string;
    shouldResize?: boolean;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const { images } = (await req.json()) as Body;
    const uploadPromises = images.map(
      async ({ image, imageType, imageName, shouldResize }) => {
        if (!image || typeof image !== "string") {
          throw new Error("Invalid image - expected base64 encoded string");
        }
        const verifiedImageType = imageType as IMAGE_TYPE;
        if (
          !imageType ||
          !Object.values(IMAGE_TYPE).includes(verifiedImageType)
        ) {
          throw new Error(
            "Invalid imageType - expected image/jpeg or image/png",
          );
        }
        let imageBuffer = Buffer.from(image, "base64");
        if (imageBuffer.length > 20 * 1024 * 1024) {
          throw new Error("Image exceeds 20MB limit.");
        }
        if (shouldResize) {
          imageBuffer = await resizeImageForGptVision(
            imageBuffer,
            verifiedImageType,
          );
        }
        const imagePath = await uploadToS3(
          imageBuffer,
          verifiedImageType,
          bucketName,
          imageName,
        );
        return await getSignedUrl(imagePath, bucketName);
      },
    );
    const urls = await Promise.all(uploadPromises);
    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.log("Error uploading image", error);
    return NextResponse.json(
      { success: false, errors: [String(error)] },
      { status: 500 },
    );
  }
}
