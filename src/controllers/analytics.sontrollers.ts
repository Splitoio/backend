import { Request, Response } from "express";
import { getMonthlyAnalytics } from "../services/analytics.service";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const analyticsData = await getMonthlyAnalytics(userId);
    res.json(analyticsData);
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch analytics" });
  }
};
