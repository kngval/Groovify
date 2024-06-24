import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
dotenv.config();
// function generateRandomString(num: number): string {
//   const alphaNumeric =
//     "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   let res: string = "";
//   for (let i = 0; i < num; i++) {
//     res += alphaNumeric.charAt(Math.floor(Math.random() * alphaNumeric.length));
//   }
//   return res as string;
// }
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = "http://localhost:5173/login";
export const loginRedirect = async (_req: Request, res: Response) => {
  // const state = generateRandomString(10);
  const scope = [
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "playlist-read-private",
    "user-read-currently-playing",
    "user-top-read",
  ].join(" ");

  const authUrl =
    `https://accounts.spotify.com/authorize` +
    `?response_type=code` +
    `&client_id=${client_id}` +
    `&scope=${encodeURIComponent(scope)}` +
    // `&state=${state}` +
    `&redirect_uri=${redirect_uri}`;

  res.redirect(authUrl);
};

export const callback = async (req: Request, res: Response) => {
  const { code } = req.query || null;

  if (typeof code !== "string") {
    return res.status(400).json({ error: "Invalid Code" }); // Check for invalid code
  }
  try {
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }).toString(),
    };

    const response = await axios(authOptions);
    if (response) {
      const { access_token, refresh_token, expires_in } = response.data;
      console.log("Exp type :", typeof response.data.expires_in);
      console.log("BACKEND RESPONSE :", response.data);

      const userProfile = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const jwt_secret = process.env.JWT_SECRET as string;
      const jwtToken = jwt.sign(
        {
          id: userProfile.data.id,
          email: userProfile.data.email,
          display_name: userProfile.data.display_name,
          accessToken: access_token,
        },
        jwt_secret,
        {
          expiresIn: "3d",
        }
      );
      return res
        .status(200)
        .json({ access_token, jwtToken: jwtToken, expires_in, refresh_token });
    } else {
      return res.status(400).json({ error: "Authorization Error" });
    }
  } catch (error: any) {
    console.error(
      "Token Exchange Error: ",
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ error: error.response?.data || error.message });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const { refresh_token } = req.query;
  if (!refresh_token || typeof refresh_token !== "string") {
    return res.status(400).json({ error: "Invalid or missing refresh token" });
  }
  console.log("refresh token in backend", refresh_token);
  try {
    console.log("REFRESHING NEW TOKEN...");
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
        client_id: client_id as string,
      }).toString(),
    };
    const response = await axios(authOptions);

    if (response) {
      console.log("NEW RES DATA: ", response.data);
      const { access_token, expires_in } = response.data;
      console.log("NEW ACCESS TOKEN : ", access_token);
      if (req.user) {
        req.user.accessToken = access_token as string;
        const jwt_secret = process.env.JWT_SECRET as string;

        // Generate new JWT token with updated access token
        const jwtToken = jwt.sign(
          {
            id: req.user.id,
            email: req.user.email,
            display_name: req.user.display_name,
            accessToken: access_token,
          },
          jwt_secret,
          {
            expiresIn: "3d",
          }
        );
        console.log("NEW REQ USER: ", req.user);

        return res.status(200).json({ jwtToken, expires_in });
      } else {
        return res
          .status(400)
          .json({ error: "Failed to refresh access token" });
      }
    }
  } catch (error: any) {
    console.error(
      "Refresh Token Error: ",
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ error: error.response?.data || error.message });
  }
};
