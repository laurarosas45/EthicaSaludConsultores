// middlewares/auth.js
import jwt from "jsonwebtoken";

/**
 * Middleware que valida token JWT.
 * Acepta token por:
 * 1) Header:  Authorization: Bearer <token>
 * 2) Query string: ?token=<token>
 */
export function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    let token = null;

    // 1. Intentar desde header
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 2. Si no viene en header, intentar desde query
    if (!token && req.query?.token) {
      const t = req.query.token;
      // A veces puede llegar como array (Express behavior)
      token = Array.isArray(t) ? t[0] : String(t).trim();
    }

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    // 3. Verificar JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role }

    next();
  } catch (err) {
    console.error("[authRequired]", err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

/**
 * Middleware opcional para roles específicos
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "No auth" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Sin permisos" });
    next();
  };
}
