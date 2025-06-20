import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import readline from "readline";

// Load environment variables
config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing Supabase URL or Service Role Key");
  console.error(
    "Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) in your .env file",
  );
  console.error(
    "Note: You need the SERVICE ROLE key, not the anon key, to update user passwords",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateUserPassword() {
  try {
    console.log("=== Update User Password ===\n");

    // Get user ID from command line args or input
    let userId = process.argv[2];
    if (!userId) {
      userId = await askQuestion("Enter user ID: ");
    }

    // Get new password from command line args or input
    let newPassword = process.argv[3];
    if (!newPassword) {
      newPassword = await askQuestion("Enter new password: ");
    }

    console.log(`\nUpdating password for user: ${userId}`);
    console.log(`New password: ${"*".repeat(newPassword.length)}\n`);

    // Update user password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    console.log("✅ Password updated successfully!");
    console.log("User ID:", userId);
    console.log("New Password:", newPassword);
    console.log("User Email:", data.user.email);

    // Also check if user exists in users table
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("id", userId)
        .single();

      if (userError) {
        console.warn(
          "Could not fetch user from users table:",
          userError.message,
        );
      } else {
        console.log("User info from users table:");
        console.log("- Name:", userData.name);
        console.log("- Email:", userData.email);
        console.log("- Role:", userData.role);
      }
    } catch (userErr) {
      console.warn("Could not check users table");
    }
  } catch (error) {
    console.error("❌ Error updating user password:", error.message);
    if (error.message.includes("User not found")) {
      console.error("The user ID might not exist in your Supabase project");
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Show usage help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage: yarn update-password [user-id] [new-password]

Arguments:
  user-id       UUID of the user to update
  new-password  New password for the user

Examples:
  yarn update-password                                    # Interactive mode
  yarn update-password 18babd2b-1621-4b8f-bb2c-e4de266d8a55 newpass123
  yarn update-password "user-uuid" "my-new-password"

Options:
  -h, --help    Show this help message
`);
  process.exit(0);
}

updateUserPassword();
