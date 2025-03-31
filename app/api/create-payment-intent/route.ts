import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { NextRequest } from "next/server";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16", // Using the older version as requested
  typescript: true,
});

// POST handler for creating a Stripe PaymentIntent
export async function POST(req: NextRequest) {
  console.log(
    "API Route: STRIPE_SECRET_KEY starts with:",
    process.env.STRIPE_SECRET_KEY?.substring(0, 8) || "Not found"
  );

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Server configuration error: Missing Stripe secret key" },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error("Failed to parse request body:", jsonError);
      return NextResponse.json(
        { error: "Invalid request body: Must be valid JSON" },
        { status: 400 }
      );
    }

    const { amount } = body;
    console.log("Received amount from frontend (cents):", amount);

    if (!amount || typeof amount !== "number" || amount <= 0) {
      console.log("Invalid amount provided:", amount);
      return NextResponse.json(
        { error: "Invalid amount: Must be a positive number" },
        { status: 400 }
      );
    }

    const roundedAmount = Math.round(amount);
    if (roundedAmount !== amount) {
      console.log(
        "Amount was rounded to nearest integer (cents):",
        amount,
        "->",
        roundedAmount
      );
    }

    console.log("Sending to Stripe - Amount (cents):", roundedAmount);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: roundedAmount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    console.log(
      "PaymentIntent created - Amount (cents):",
      paymentIntent.amount,
      "ID:",
      paymentIntent.id
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(
        "Stripe error in /api/create-payment-intent:",
        error.type,
        error.message,
        error.code
      );
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in /api/create-payment-intent:", errorMessage);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}