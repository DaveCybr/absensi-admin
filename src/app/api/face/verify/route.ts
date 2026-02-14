// FILE: src/app/api/face/verify/route.ts
// PURPOSE: Face Verification - Compare embeddings untuk attendance

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ============================================
// FACE VERIFICATION API
// Purpose: Compare captured face dengan enrolled face
// ============================================

export async function POST(request: Request) {
  try {
    const { employeeId, faceImageBase64, latitude, longitude } =
      await request.json();

    if (!employeeId || !faceImageBase64) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Get employee's enrolled face embedding
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("face_embedding, face_token, is_face_enrolled, name")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // 2. Check if face enrolled
    if (!employee.is_face_enrolled || !employee.face_embedding) {
      return NextResponse.json(
        {
          error: "Face not enrolled",
          message: "Please complete face enrollment first",
        },
        { status: 400 },
      );
    }

    // 3. Detect face in captured image
    const detectionResponse = await fetch(
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
        }),
      },
    );

    const detectionData = await detectionResponse.json();

    // 4. Validate detection
    if (!detectionData.faces || detectionData.faces.length === 0) {
      return NextResponse.json(
        {
          success: false,
          matched: false,
          error: "No face detected",
          message: "Pastikan wajah terlihat jelas di kamera",
        },
        { status: 200 },
      );
    }

    if (detectionData.faces.length > 1) {
      return NextResponse.json(
        {
          success: false,
          matched: false,
          error: "Multiple faces",
          message: "Hanya satu orang yang diperbolehkan",
        },
        { status: 200 },
      );
    }

    const capturedFaceToken = detectionData.faces[0].face_token;

    // 5. Generate embedding for captured face
    const capturedEmbedding = await generateEmbedding(capturedFaceToken);

    // 6. Compare embeddings
    const similarity = calculateCosineSimilarity(
      employee.face_embedding,
      capturedEmbedding,
    );

    // 7. Determine if match (threshold: 0.7 = 70% similarity)
    const SIMILARITY_THRESHOLD = 0.7;
    const isMatch = similarity >= SIMILARITY_THRESHOLD;

    // 8. Log verification attempt
    await supabase.from("face_verification_logs").insert({
      employee_id: employeeId,
      similarity_score: similarity,
      is_match: isMatch,
      latitude: latitude,
      longitude: longitude,
      created_at: new Date().toISOString(),
    });

    // 9. Return result
    if (isMatch) {
      return NextResponse.json({
        success: true,
        matched: true,
        similarity: Math.round(similarity * 100), // Convert to percentage
        message: `Verifikasi berhasil! Similarity: ${Math.round(similarity * 100)}%`,
        employeeName: employee.name,
      });
    } else {
      return NextResponse.json({
        success: true,
        matched: false,
        similarity: Math.round(similarity * 100),
        message: `Wajah tidak cocok. Similarity: ${Math.round(similarity * 100)}% (minimal ${SIMILARITY_THRESHOLD * 100}%)`,
      });
    }
  } catch (error: any) {
    console.error("Face verification error:", error);
    return NextResponse.json(
      { error: error.message || "Face verification failed" },
      { status: 500 },
    );
  }
}

// ============================================
// HELPER: Generate Embedding
// ============================================
async function generateEmbedding(faceToken: string): Promise<number[]> {
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
  return data.faces[0].embedding || [];
}

// ============================================
// HELPER: Calculate Cosine Similarity
// Formula: cos(θ) = (A · B) / (||A|| × ||B||)
// Range: -1 to 1 (higher = more similar)
// ============================================
function calculateCosineSimilarity(
  vectorA: number[],
  vectorB: number[],
): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have same length");
  }

  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Return cosine similarity
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================
// ALTERNATIVE: Euclidean Distance
// Lower distance = more similar
// ============================================
function calculateEuclideanDistance(
  vectorA: number[],
  vectorB: number[],
): number {
  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Usage:
// const distance = calculateEuclideanDistance(embeddingA, embeddingB);
// const isMatch = distance < 0.6; // Lower threshold = stricter
