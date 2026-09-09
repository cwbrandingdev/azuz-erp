"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContentReviewPanel } from "@/components/content/content-review-panel";
import { contentService } from "@/services";
import type { ContentPost, PostHistory } from "@/services/types";

export default function ContentReviewPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const [post, setPost] = useState<ContentPost | null>(null);
  const [history, setHistory] = useState<PostHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const [postData, historyData] = await Promise.all([
        contentService.getPost(postId),
        contentService.getPostHistory(postId),
      ]);
      setPost(postData);
      setHistory(historyData);
    } catch {
      setPost(null);
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full max-w-[98vw] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!post || !history) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[98vw] items-center justify-center px-6">
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
          <p className="text-sm text-[var(--atria-primary)]/50">
            Post não encontrado ou você não tem permissão para visualizá-lo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ContentReviewPanel
      post={post}
      history={history}
      onRefresh={loadData}
      showBackLink
    />
  );
}
