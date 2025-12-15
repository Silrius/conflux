import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { createUser, findUserByEmail, findUserById, updateUser } from "../users/users.store";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./auth.tokens";
import { requireAuth, AuthedRequest } from "./auth.middleware";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

function setRefreshCookie(res: any, refreshToken: string) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true in production with HTTPS
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, username, password } = parsed.data;

  if (findUserByEmail(email)) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser({
    id: crypto.randomUUID(),
    email,
    username,
    passwordHash,
    avatarUrl: "",
    aboutText: "",
    aboutVideoUrl: ""
  });

  const payload = { sub: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // store refresh token hash so we can invalidate later
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  updateUser(user.id, { refreshTokenHash });

  setRefreshCookie(res, refreshToken);

  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, aboutText: user.aboutText }
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const payload = { sub: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  updateUser(user.id, { refreshTokenHash });

  setRefreshCookie(res, refreshToken);

  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, aboutText: user.aboutText }
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const user = findUserById(payload.sub);
    if (!user?.refreshTokenHash) return res.status(401).json({ error: "Invalid refresh token" });

    const matches = await bcrypt.compare(token, user.refreshTokenHash);
    if (!matches) return res.status(401).json({ error: "Invalid refresh token" });

    // rotate refresh token (good practice)
    const newRefreshToken = signRefreshToken({ sub: user.id, username: user.username });
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    updateUser(user.id, { refreshTokenHash: newRefreshTokenHash });
    setRefreshCookie(res, newRefreshToken);

    const newAccessToken = signAccessToken({ sub: user.id, username: user.username });

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: "Invalid/expired refresh token" });
  }
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const u = req.user!;
  const user = findUserById(u.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    aboutText: user.aboutText,
    aboutVideoUrl: user.aboutVideoUrl
  });
});

router.post("/logout", requireAuth, async (req: AuthedRequest, res) => {
  const user = findUserById(req.user!.id);
  if (user) updateUser(user.id, { refreshTokenHash: undefined });

  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  return res.json({ ok: true });
});

export default router;
