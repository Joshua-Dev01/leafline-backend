import { Request, Response } from "express";
import axios from "axios";
import { Plan } from "../model/pricing.model";
import { LeafLineUser } from "../../../MainAuth/signup/model/user.model";


const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

// Get available plans
export const getPlans = async (req: Request, res: Response) => {
  const plans = await Plan.find({ isActive: true });
  res.json({ success: true, plans });
};

// Initialize subscription payment
export const subscribePlan = async (req: Request, res: Response) => {
  const { planId } = req.body;
  const user = req.user; // from auth middleware
  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: LeafLineUser.email,
        amount: plan.price, // in kobo
        callback_url: `${FRONTEND_URL}/subscription-success`,
          metadata: { planId, userId: LeafLineUser._id },
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify payment and update subscription
export const verifyPayment = async (req: Request, res: Response) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const data = response.data.data;
    if (data.status !== "success") return res.status(400).json({ success: false, message: "Payment failed" });

    // Extract metadata
    const { planId, userId } = data.metadata;

      const user = await LeafLineUser.findById(userId);
    const plan = await Plan.findById(planId);
    if (!user || !plan) return res.status(404).json({ success: false, message: "User or plan not found" });

    // Update user's subscription
    user.subscription = {
      plan: plan._id,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
      active: true,
    };
    await user.save();

    res.json({ success: true, subscription: user.subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
