import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

/**
 * GET /api/ingested-courses - List all ingested courses for the current user
 */
export async function GET(request) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        // Get user ID from auth
        let userId = null;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (sessionCookie) {
            try {
                const { getAuth } = await import("firebase-admin/auth");
                const decoded = await getAuth().verifySessionCookie(
                    sessionCookie.value,
                    true
                );
                // Use email consistently (matches how other parts of the app identify users)
                userId = decoded.email || decoded.uid;
            } catch {
                // try token
            }
        }

        if (!userId) {
            const authHeader = request.headers.get("authorization");
            if (authHeader) {
                try {
                    const { getAuth } = await import("firebase-admin/auth");
                    const token = authHeader.replace("Bearer ", "");
                    const decoded = await getAuth().verifyIdToken(token);
                    // Use email consistently
                    userId = decoded.email || decoded.uid;
                } catch {
                    // auth failed
                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        let snapshot;
        try {
            // Try with orderBy first (requires composite index)
            snapshot = await db
                .collection("ingested_courses")
                .where("userId", "==", userId)
                .orderBy("createdAt", "desc")
                .get();
        } catch (queryError) {
            console.log("OrderBy query failed, fetching without orderBy:", queryError.message);
            // If orderBy fails (missing index), fetch without it
            snapshot = await db
                .collection("ingested_courses")
                .where("userId", "==", userId)
                .get();
        }

        const courses = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const courseId = doc.id;

            // Fetch progress for this user/course
            let progress = 0;
            try {
                const progressRef = db
                    .collection("ingested_courses")
                    .doc(courseId)
                    .collection("progress")
                    .doc(userId);
                const progressSnap = await progressRef.get();
                if (progressSnap.exists) {
                    progress = progressSnap.data().progress || 0;
                }
            } catch (err) {
                console.error(`Error fetching progress for course ${courseId}:`, err);
            }

            return {
                id: courseId,
                title: data.title,
                description: data.description,
                chapterCount: data.metadata?.chapterCount || 0,
                totalWords: data.metadata?.totalWords || 0,
                estimatedReadingTime: data.metadata?.estimatedReadingTime || 0,
                progress,
                source: {
                    fileName: data.source?.fileName || "",
                    fileType: data.source?.fileType || "",
                },
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || null,
            };
        }));

        // Sort in memory by createdAt (newest first)
        courses.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching ingested courses:", error);
        return NextResponse.json(
            { error: "Failed to fetch courses", details: error.message },
            { status: 500 }
        );
    }
}
