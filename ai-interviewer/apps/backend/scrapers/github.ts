import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

// In-memory cache to avoid burning GitHub API rate limits during testing
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  topics: string[];
  url: string;
  updatedAt: string;
  isFork: boolean;
}

export interface GitHubUserProfile {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  profileUrl: string;
}

export interface ScrapedGithubData {
  profile: GitHubUserProfile;
  repos: GitHubRepo[];
  topLanguages: { language: string; count: number }[];
  totalStars: number;
}

export async function scrapeGithub(username: string): Promise<ScrapedGithubData> {
  const cached = cache.get(username.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[GitHub Scraper] Serving ${username} from in-memory cache.`);
    return cached.data;
  }

  // Build axios config with optional proxy and optional GitHub token
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "AI-Interviewer-App",
  };

  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const axiosConfig: any = { headers };

  // Only use proxy agent if PROXY_URL is explicitly configured
  if (process.env.PROXY_URL && process.env.PROXY_URL.trim() !== "") {
    try {
      axiosConfig.httpsAgent = new HttpsProxyAgent(process.env.PROXY_URL);
    } catch (err) {
      console.warn("[GitHub Scraper] Invalid PROXY_URL provided, falling back to direct connection:", err);
    }
  }

  try {
    // 1. Fetch user profile
    const profileRes = await axios.get(`https://api.github.com/users/${username}`, axiosConfig);
    const p = profileRes.data;

    const profile: GitHubUserProfile = {
      username: p.login,
      name: p.name || p.login,
      avatarUrl: p.avatar_url,
      bio: p.bio,
      company: p.company,
      location: p.location,
      blog: p.blog,
      publicRepos: p.public_repos,
      followers: p.followers,
      following: p.following,
      profileUrl: p.html_url,
    };

    // 2. Fetch user repositories (up to 100 sorted by updated)
    const reposRes = await axios.get(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
      axiosConfig
    );

    const repos: GitHubRepo[] = reposRes.data.map((x: any) => ({
      name: x.name,
      fullName: x.full_name,
      description: x.description,
      language: x.language,
      starCount: x.stargazers_count ?? 0,
      forkCount: x.forks_count ?? 0,
      topics: x.topics || [],
      url: x.html_url,
      updatedAt: x.updated_at,
      isFork: Boolean(x.fork),
    }));

    // Calculate language frequencies
    const langMap = new Map<string, number>();
    let totalStars = 0;

    for (const repo of repos) {
      totalStars += repo.starCount;
      if (repo.language) {
        langMap.set(repo.language, (langMap.get(repo.language) || 0) + 1);
      }
    }

    const topLanguages = Array.from(langMap.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    const result: ScrapedGithubData = {
      profile,
      repos,
      topLanguages,
      totalStars,
    };

    cache.set(username.toLowerCase(), { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    if (error.response?.status === 403) {
      const resetTime = error.response.headers["x-ratelimit-reset"];
      const resetDate = resetTime ? new Date(Number(resetTime) * 1000).toLocaleTimeString() : "soon";
      throw new Error(
        `GitHub API rate limit exceeded. Reset at ${resetDate}. Tip: Add a GITHUB_TOKEN to your .env to get 5,000 requests/hour.`
      );
    }
    if (error.response?.status === 404) {
      throw new Error(`GitHub user "${username}" not found. Please check the username or profile URL.`);
    }
    throw new Error(error.message || "Failed to fetch GitHub profile.");
  }
}