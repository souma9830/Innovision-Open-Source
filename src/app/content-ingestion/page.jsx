"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  BookOpen,
  Loader2,
  Crown,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  BookMarked,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageBackground,
  GridPattern,
  PageHeader,
  ScrollReveal,
  HoverCard,
} from "@/components/ui/PageWrapper";

export default function ContentIngestion() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState({ isPremium: false });
  const [processingStatus, setProcessingStatus] = useState("");
  const [result, setResult] = useState(null);
  const [pastCourses, setPastCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const router = useRouter();
  const { user, getToken } = useAuth();

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (user) {
        try {
          const res = await fetch("/api/premium/status");
          const data = await res.json();
          setPremiumStatus(data);
        } catch (error) {
          console.error("Error fetching premium status:", error);
        }
      }
    };
    fetchPremiumStatus();
  }, [user]);

  useEffect(() => {
    fetchPastCourses();
  }, [user]);

  const fetchPastCourses = async () => {
    if (!user) {
      setLoadingCourses(false);
      return;
    }
    try {
      const token = await getToken?.();
      console.log("[DEBUG] Fetching courses for user:", user?.email || user?.uid);
      const res = await fetch("/api/ingested-courses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[DEBUG] Fetched courses count:", data.courses?.length || 0);
        console.log("[DEBUG] Courses:", data.courses);
        setPastCourses(data.courses || []);
      } else {
        console.error("[DEBUG] Failed to fetch courses:", res.status, await res.text());
      }
    } catch (error) {
      console.error("Error fetching past courses:", error);
    }
    setLoadingCourses(false);
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    setProcessingStatus("Uploading file...");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProcessingStatus("Extracting text from document...");

      // Simulate status updates at intervals
      const statusTimer = setTimeout(() => {
        setProcessingStatus("Analyzing content with AI...");
      }, 3000);

      const statusTimer2 = setTimeout(() => {
        setProcessingStatus("Generating chapters and structure...");
      }, 8000);

      const statusTimer3 = setTimeout(() => {
        setProcessingStatus("Saving course to database...");
      }, 15000);

      const headers = {};
      try {
        if (user) {
          const token = await getToken?.();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {
        console.log("Could not get auth token, proceeding without auth");
      }

      const response = await fetch("/api/content/ingest", {
        method: "POST",
        headers,
        body: formData,
      });

      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      clearTimeout(statusTimer3);

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
        toast.success(data.message || "Course created successfully!");

        // Optimistically add the new course to the list immediately
        const newCourse = {
          id: data.courseId,
          title: data.title,
          description: data.description,
          chapterCount: data.chapterCount,
          totalWords: data.totalWords,
          estimatedReadingTime: data.estimatedReadingTime,
          source: {
            fileName: file.name,
            fileType: file.name.split('.').pop().toLowerCase(),
          },
          status: "processed",
          createdAt: new Date(), // Use current time for optimistic update
        };

        // Add to the beginning of the list (most recent first)
        setPastCourses(prev => [newCourse, ...prev]);

        // Fetch from server after a small delay to ensure Firestore consistency
        setTimeout(() => {
          fetchPastCourses();
        }, 500);
      } else {
        toast.error(data.error || "Failed to ingest content");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    }
    setUploading(false);
    setProcessingStatus("");
  };

  const getFileTypeIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "epub":
        return <BookMarked className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 relative">
      <PageBackground />
      <GridPattern opacity={0.02} />

      <div className="max-w-7xl mt-10 mx-auto relative z-10">
        <PageHeader
          title="Smart Content Ingestion"
          description="Upload educational documents and AI will create structured courses with chapters"
          icon={Upload}
          iconColor="text-purple-500"
          badge={
            <>
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <ScrollReveal delay={150} className="space-y-6">
            <HoverCard>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-purple-500" />
                    </div>
                    Upload Content
                  </CardTitle>
                  <CardDescription>
                    Upload PDFs, text files, or eBooks to generate AI-structured
                    courses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="file"
                    accept=".pdf,.txt,.epub"
                    onChange={(e) => {
                      setFile(e.target.files[0]);
                      setResult(null);
                    }}
                    disabled={uploading}
                    className="bg-background/50"
                  />

                  {file && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                          {file.size > 5 * 1024 * 1024 && (
                            <span className="text-yellow-500 ml-2">
                              ⚠ Large file — processing may take longer
                            </span>
                          )}
                        </p>
                      </div>
                      {!uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            const input =
                              document.querySelector('input[type="file"]');
                            if (input) input.value = "";
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleFileUpload}
                    disabled={uploading || !file}
                    className="w-full bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Course with AI
                      </>
                    )}
                  </Button>

                  {uploading && processingStatus && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      <span>{processingStatus}</span>
                    </div>
                  )}

                  {/* Success Result */}
                  {result && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <h4 className="font-semibold text-green-700 dark:text-green-300">
                          Course Created Successfully!
                        </h4>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Title:</strong> {result.title}
                        </p>
                        <p>
                          <strong>Chapters:</strong> {result.chapterCount}
                        </p>
                        <p>
                          <strong>Total Words:</strong>{" "}
                          {result.totalWords?.toLocaleString()}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Est. reading time: {result.estimatedReadingTime} min
                        </p>
                      </div>

                      {result.chapters && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            Chapters Generated:
                          </p>
                          <ul className="space-y-1">
                            {result.chapters.map((ch) => (
                              <li
                                key={ch.id}
                                className="text-xs flex items-center gap-2 p-1.5 rounded hover:bg-muted/50"
                              >
                                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-[10px] font-bold">
                                  {ch.chapterNumber}
                                </span>
                                {ch.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        onClick={() =>
                          router.push(`/ingested-course/${result.courseId}`)
                        }
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Course
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </HoverCard>

            <HoverCard>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>Supported Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm mb-5">
                    <li className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <FileText className="h-4 w-4 text-red-500" />
                      <div>
                        <span className="font-medium">PDF</span>
                        <span className="text-muted-foreground ml-1">
                          — Text-based PDFs (not scanned images)
                        </span>
                      </div>
                    </li>
                    <li className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <span className="font-medium">TXT</span>
                        <span className="text-muted-foreground ml-1">
                          — Plain text files (UTF-8)
                        </span>
                      </div>
                    </li>
                    <li className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <BookMarked className="h-4 w-4 text-green-500" />
                      <div>
                        <span className="font-medium">EPUB</span>
                        <span className="text-muted-foreground ml-1">
                          — eBooks (text content only)
                        </span>
                      </div>
                    </li>
                  </ul>
                  <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Maximum file size: 10MB. Large files may take 1-2 minutes to process.</span>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </ScrollReveal>

          {/* Past Courses Section */}
          <ScrollReveal delay={200} className="space-y-6">
            <HoverCard>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                    </div>
                    Your Ingested Courses
                  </CardTitle>
                  <CardDescription>
                    Previously uploaded documents converted to courses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : pastCourses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No courses yet</p>
                      <p className="text-xs mt-1">
                        Upload a document to create your first AI course
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pastCourses.map((course) => (
                        <div
                          key={course.id}
                          className="p-3 rounded-xl border border-border/50 bg-background/30 hover:bg-muted/50 transition-all cursor-pointer group"
                          onClick={() =>
                            router.push(`/ingested-course/${course.id}`)
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate group-hover:text-purple-500 transition-colors">
                                {course.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {getFileTypeIcon(course.source?.fileType)}
                                  {course.source?.fileName}
                                </span>
                                <span>
                                  {course.chapterCount} chapters
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {course.estimatedReadingTime} min
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3 space-y-1.5">
                                <div className="flex justify-between text-[10px] font-medium">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="text-purple-500">{course.progress || 0}%</span>
                                </div>
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-linear-to-r from-purple-500 to-blue-500 transition-all duration-500"
                                    style={{ width: `${course.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </HoverCard>

            {/* How It Works */}
            <HoverCard>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-border/50 rounded-xl bg-background/30">
                      <ol className="space-y-4 text-sm list-none">
                        {[
                          { step: "Upload", desc: "Select a PDF, TXT, or EPUB document" },
                          { step: "Extract", desc: "AI extracts readable text from your document" },
                          { step: "Analyze", desc: "Gemini AI identifies topics and sections" },
                          { step: "Structure", desc: "Content is organized into logical chapters" },
                          { step: "Learn", desc: "Open your new course and start reading!" },
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-linear-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <span className="font-medium">{item.step}</span>
                              <span className="text-muted-foreground ml-1">
                                — {item.desc}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}