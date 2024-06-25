import { type NextRequest, NextResponse } from "next/server";
import {
  getSignedUrl,
  resizeImageForGptVision,
  uploadToS3,
  IMAGE_TYPE,
} from "~/server/utils/images";

const bucketName = process.env.BUCKET_NAME ?? "";

interface Body {
  image: unknown;
  imageType?: string;
  imageName?: string;
  shouldResize?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const {
      image,
      imageType,
      imageName,
      shouldResize = false,
    } = (await req.json()) as Body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid image - expected base64 encoded string",
        },
        { status: 400 },
      );
    }

    const verifiedImageType = imageType as IMAGE_TYPE;
    if (!imageType || !Object.values(IMAGE_TYPE).includes(verifiedImageType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid imageType - expected image/jpeg or image/png",
        },
        { status: 400 },
      );
    }

    let imageBuffer = Buffer.from(image, "base64");
    let resizedImageBuffer = imageBuffer;
    if (shouldResize) {
      resizedImageBuffer = await resizeImageForGptVision(
        imageBuffer,
        verifiedImageType,
      );
    }
    const imagePath = await uploadToS3(
      resizedImageBuffer,
      verifiedImageType,
      bucketName,
      imageName,
    );
    const url = await getSignedUrl(imagePath, bucketName);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Error uploading image", error);
    let errorMessage = "An unexpected error occurred while uploading the image";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
