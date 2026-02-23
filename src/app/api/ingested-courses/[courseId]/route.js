import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/ingested-courses/[courseId] - Get a specific ingested course with its chapters
 */
export async function GET(request, { params }) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const { courseId } = await params;
        const courseRef = db.collection("ingested_courses").doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const courseData = courseSnap.data();

        // Get user ID from auth to fetch progress
        let userId = null;
        try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get("session");

            if (sessionCookie) {
                const { getAuth } = await import("firebase-admin/auth");
                const decoded = await getAuth().verifySessionCookie(sessionCookie.value, true);
                userId = decoded.email || decoded.uid;
            } else {
                const authHeader = request.headers.get("authorization");
                if (authHeader) {
                    const { getAuth } = await import("firebase-admin/auth");
                    const token = authHeader.replace("Bearer ", "");
                    const decoded = await getAuth().verifyIdToken(token);
                    userId = decoded.email || decoded.uid;
                }
            }
        } catch (authError) {
            console.error("Auth error in course detail API:", authError);
        }

        // Fetch progress if userId is available
        let progressData = { progress: 0, completedChapters: [] };
        if (userId) {
            const progressRef = courseRef.collection("progress").doc(userId);
            const progressSnap = await progressRef.get();
            if (progressSnap.exists) {
                progressData = progressSnap.data();
            }
        }

        // Fetch chapters
        const chaptersSnap = await courseRef
            .collection("chapters")
            .orderBy("order", "asc")
            .get();

        const chapters = chaptersSnap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                chapterNumber: data.chapterNumber,
                title: data.title,
                summary: data.summary,
                wordCount: data.wordCount,
                order: data.order,
                isCompleted: progressData.completedChapters?.includes(data.chapterNumber) || false,
            };
        });

        return NextResponse.json({
            course: {
                id: courseSnap.id,
                title: courseData.title,
                description: courseData.description,
                metadata: courseData.metadata,
                source: courseData.source,
                status: courseData.status,
                createdAt: courseData.createdAt?.toDate?.() || null,
                progress: progressData.progress || 0,
            },
            chapters,
        });
    } catch (error) {
        console.error("Error fetching ingested course:", error);
        return NextResponse.json(
            { error: "Failed to fetch course" },
            { status: 500 }
        );
    }
}
