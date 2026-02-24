// Test API for admin to verify Instagram automation works

import { NextRequest, NextResponse } from "next/server";
import { registerInstagramAccount, followInstagramUser } from "@/lib/instagram";

// Simple admin password check
const ADMIN_PASSWORD = "admin123"; // Change this in production

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, testUsername, testPassword, targetUsername, password } = body;

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "test_register") {
      // Test account registration
      if (!testUsername || !testPassword || !body.email) {
        return NextResponse.json(
          { error: "Missing testUsername, testPassword, or email" },
          { status: 400 }
        );
      }

      const result = await registerInstagramAccount({
        username: testUsername,
        email: body.email,
        password: testPassword,
        proxy: body.proxy,
      });

      return NextResponse.json({
        success: true,
        action: "register",
        result,
      });
    }

    if (action === "test_follow") {
      // Test following a user
      if (!testUsername || !testPassword || !targetUsername) {
        return NextResponse.json(
          { error: "Missing testUsername, testPassword, or targetUsername" },
          { status: 400 }
        );
      }

      const result = await followInstagramUser(
        testUsername,
        testPassword,
        targetUsername
      );

      return NextResponse.json({
        success: true,
        action: "follow",
        result,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'test_register' or 'test_follow'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
