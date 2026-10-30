"use client";

import { useState } from "react";
import { BadgeCheck, Heart, Layers, MessageCircle, Play } from "lucide-react";
import type { InstagramQualificationSnapshot } from "@/lib/lead-qualification-utils";

type InstagramPost = NonNullable<
  InstagramQualificationSnapshot["recentPosts"]
>[number];

function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return value.toLocaleString("pt-BR");
}

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

function formatLastPost(profile: InstagramQualificationSnapshot): string | null {
  const fromPosts = [...(profile.recentPosts ?? [])]
    .map((post) => post.timestamp)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  const iso = profile.lastPostAt || fromPosts;
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;

  const date = new Date(parsed).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const days =
    profile.daysSinceLastPost ??
    Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
  if (days <= 0) return `${date} · hoje`;
  if (days === 1) return `${date} · há 1 dia`;
  return `${date} · há ${days} dias`;
}

function Stat({
  value,
  label,
}: {
  value: number | null | undefined;
  label: string;
}) {
  return (
    <div className="text-center">
      <p className="text-base font-semibold leading-tight text-[#262626]">
        {formatCompact(value)}
      </p>
      <p className="text-xs text-[#262626]">{label}</p>
    </div>
  );
}

function Avatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (!src || failed) {
    return (
      <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-xl font-semibold text-[#737373]">
        {initial}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="size-20 shrink-0 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function PostTile({ post, index }: { post: InstagramPost; index: number }) {
  const [failed, setFailed] = useState(false);
  const isReel = post.mediaType === "reel" || post.mediaType === "video";
  const caption = post.caption?.trim();
  const image =
    post.displayUrl && !failed ? (
      <img
        src={post.displayUrl}
        alt={caption || `Publicação ${index + 1}`}
        className="aspect-square w-full object-cover"
        onError={() => setFailed(true)}
      />
    ) : (
      <div className="flex aspect-square w-full items-center justify-center bg-[#efefef] text-[10px] text-[#737373]">
        Sem imagem
      </div>
    );

  const tile = (
    <div className="group relative bg-[#efefef]">
      {image}
      {post.mediaType === "carousel" ? (
        <Layers className="absolute top-1.5 right-1.5 size-4 text-white drop-shadow" />
      ) : null}
      {isReel ? (
        <Play className="absolute top-1.5 right-1.5 size-4 fill-white text-white drop-shadow" />
      ) : null}
      {post.views != null ? (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
          <Play className="size-3 fill-white" />
          {formatCompact(post.views)}
        </span>
      ) : null}
      {(post.likes != null || post.comments != null) && (
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          {post.likes != null ? (
            <span className="flex items-center gap-1">
              <Heart className="size-4 fill-white" />
              {formatCompact(post.likes)}
            </span>
          ) : null}
          {post.comments != null ? (
            <span className="flex items-center gap-1">
              <MessageCircle className="size-4 fill-white" />
              {formatCompact(post.comments)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (!post.permalink) return tile;
  return (
    <a href={post.permalink} target="_blank" rel="noopener noreferrer">
      {tile}
    </a>
  );
}

export function InstagramProfileCard({
  profile,
}: {
  profile: InstagramQualificationSnapshot;
}) {
  const posts = profile.recentPosts?.slice(0, 9) ?? [];
  const name = profile.fullName?.trim() || profile.username || "Instagram";
  const postsCount = profile.postsCount ?? (posts.length > 0 ? posts.length : null);
  const lastPost = formatLastPost(profile);

  return (
    <article className="overflow-hidden rounded-xl border border-black/10 bg-white font-[system-ui] text-[#262626]">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-5">
          <Avatar src={profile.profilePicUrl} name={name} />
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-1">
              {profile.profileUrl ? (
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-semibold"
                >
                  {profile.username}
                </a>
              ) : (
                <p className="truncate text-sm font-semibold">{profile.username}</p>
              )}
              {profile.verified ? (
                <BadgeCheck className="size-4 shrink-0 fill-[#0095f6] text-white" />
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat value={postsCount} label="publicações" />
              <Stat value={profile.followersCount} label="seguidores" />
              <Stat value={profile.followsCount} label="seguindo" />
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-0.5 text-sm">
          {profile.fullName?.trim() ? (
            <p className="font-semibold">{profile.fullName.trim()}</p>
          ) : null}
          {profile.businessCategoryName ? (
            <p className="text-[#737373]">{profile.businessCategoryName}</p>
          ) : null}
          {profile.biography?.trim() ? (
            <p className="whitespace-pre-line">{profile.biography.trim()}</p>
          ) : null}
          {profile.externalUrl ? (
            <a
              href={profile.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate font-semibold text-[#00376b]"
            >
              {displayHost(profile.externalUrl)}
            </a>
          ) : null}
        </div>

        {lastPost ||
        profile.averageReelViews != null ||
        profile.averageLikesRecent != null ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737373]">
            {lastPost ? (
              <span>
                Último post{" "}
                <strong className="font-semibold text-[#262626]">
                  {lastPost}
                </strong>
              </span>
            ) : null}
            {profile.averageReelViews != null ? (
              <span>
                Views médios dos reels{" "}
                <strong className="font-semibold text-[#262626]">
                  {formatCompact(profile.averageReelViews)}
                </strong>
              </span>
            ) : null}
            {profile.averageLikesRecent != null ? (
              <span>
                Curtidas médias{" "}
                <strong className="font-semibold text-[#262626]">
                  {formatCompact(profile.averageLikesRecent)}
                </strong>
              </span>
            ) : null}
            {profile.highlightCount != null && profile.highlightCount > 0 ? (
              <span>
                {profile.highlightCount.toLocaleString("pt-BR")} destaques
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5 border-t border-black/10 bg-white">
          {posts.map((post, index) => (
            <PostTile
              key={`${post.permalink ?? "post"}-${index}`}
              post={post}
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="border-t border-black/10 px-4 py-8 text-center text-sm text-[#737373]">
          Nenhuma publicação recente.
        </p>
      )}
    </article>
  );
}
