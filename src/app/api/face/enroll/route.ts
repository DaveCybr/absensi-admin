// FILE: src/app/api/face/enroll/route.ts
// PURPOSE: Face Enrollment - Generate & Save Embedding

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// FACE ENROLLMENT API
// Purpose: Generate face embedding dan simpan ke database
// ============================================

export async function POST(request: Request) {
  try {
    const { employeeId, faceImageBase64 } = await request.json();

    if (!employeeId || !faceImageBase64) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // ============================================
    // OPTION A: Using External API (Recommended)
    // ============================================

    // 1. Call Face Recognition Service (contoh: Face++)
    const embeddingResponse = await fetch(
      "https://api-us.faceplusplus.com/facepp/v3/detect",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.FACEPP_API_KEY,
          api_secret: process.env.FACEPP_API_SECRET,
          image_base64: faceImageBase64,
          return_landmark: 1,
          return_attributes: "gender,age,smiling,emotion",
        }),
      },
    );

    const embeddingData = await embeddingResponse.json();

    // 2. Validasi: Pastikan hanya 1 wajah terdeteksi
    if (!embeddingData.faces || embeddingData.faces.length === 0) {
      return NextResponse.json(
        { error: "No face detected. Please try again." },
        { status: 400 },
      );
    }

    if (embeddingData.faces.length > 1) {
      return NextResponse.json(
        { error: "Multiple faces detected. Only one person allowed." },
        { status: 400 },
      );
    }

    // 3. Extract face embedding/token
    const faceToken = embeddingData.faces[0].face_token;
    const faceRectangle = embeddingData.faces[0].face_rectangle;

    // 4. Generate face embedding vector (128/512 dimensi)
    const embeddingVector = await generateEmbedding(faceToken);

    // 5. Save embedding to database
    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        face_embedding: embeddingVector, // Array of numbers
        face_token: faceToken, // Face++ token untuk reference
        face_enrolled_at: new Date().toISOString(),
        is_face_enrolled: true,
      })
      .eq("id", employeeId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Face enrolled successfully",
      faceToken: faceToken,
      faceRectangle: faceRectangle,
    });
  } catch (error: unknown) {
    console.error("Face enrollment error:", error);
    const message =
      error instanceof Error ? error.message : "Face enrollment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// HELPER: Generate Face Embedding
// ============================================
async function generateEmbedding(faceToken: string): Promise<number[]> {
  // Call Face++ to get face embedding
  const response = await fetch(
    "https://api-us.faceplusplus.com/facepp/v3/face/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.FACEPP_API_KEY,
        api_secret: process.env.FACEPP_API_SECRET,
        face_tokens: faceToken,
      }),
    },
  );

  const data = await response.json();

  // Extract embedding vector (biasanya 128 atau 512 dimensi)
  // Format: [0.123, -0.456, 0.789, ...]
  return data.faces[0].embedding || [];
}

// ============================================
// ALTERNATIVE: Local ML Model (Advanced)
// ============================================
/*
import * as tf from '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';

async function generateEmbeddingLocal(imageBuffer: Buffer): Promise<number[]> {
  // Load FaceNet model
  await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');

  // Convert buffer to tensor
  const img = await canvas.loadImage(imageBuffer);
  
  // Detect face and generate descriptor
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('No face detected');
  }

  // Return 128-dimensional embedding
  return Array.from(detection.descriptor);
}
*/
