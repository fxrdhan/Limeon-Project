import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
const askQuestion = (question: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(question, (answer: string) => {
      resolve(answer);
    });
  });
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase URL or Service Role Key');
  console.error(
    'Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) in your .env file'
  );
  console.error(
    'Note: You need the SERVICE ROLE key, not the anon key, to create users'
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

async function addAdminUser(): Promise<void> {
  try {
    console.log('=== Create Admin User ===\n');

    // Get email from user input or command line args
    let email: string = process.argv[2];
    if (!email) {
      email = await askQuestion('Enter email address: ');
    }

    // Get password from user input or command line args
    let password: string = process.argv[3];
    if (!password) {
      password = await askQuestion('Enter password: ');
    }

    // Get name from user input or command line args
    let name: string = process.argv[4];
    if (!name) {
      name = await askQuestion(
        'Enter display name (optional, press Enter to skip): '
      );
      if (!name.trim()) {
        name = 'Admin User';
      }
    }

    // Get role from user input or command line args
    let role: string = process.argv[5];
    if (!role) {
      role = await askQuestion('Enter role (default: admin): ');
      if (!role.trim()) {
        role = 'admin';
      }
    }

    console.log(`\nCreating user with:`);
    console.log(`- Email: ${email}`);
    console.log(`- Name: ${name}`);
    console.log(`- Role: ${role}`);
    console.log(`- Password: ${'*'.repeat(password.length)}\n`);

    // Create user with email and password
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

    if (authError) {
      throw authError;
    }

    console.log('User created in auth:', authData.user.id);

    // Insert user into users table
    try {
      const userData: Omit<UserData, 'id'> & { id: string } = {
        id: authData.user.id,
        name: name,
        email: email,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: userError } = await supabase
        .from('users')
        .insert(userData);

      if (userError) {
        console.warn('Could not create user record:', userError.message);
        console.warn('The user was created in auth but not in the users table');
      } else {
        console.log('User record created in users table with admin role');
      }
    } catch (userErr: unknown) {
      console.warn(
        'Users table might not exist or have different structure, skipping user record creation:',
        userErr instanceof Error ? userErr.message : String(userErr)
      );
    }

    console.log('✅ User created successfully!');
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Role:', role);
    console.log('User ID:', authData.user.id);
  } catch (error: unknown) {
    console.error(
      '❌ Error creating user:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Show usage help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: yarn add-admin [email] [password] [name] [role]

Arguments:
  email     User email address
  password  User password
  name      Display name (optional, default: "Admin User")
  role      User role (optional, default: "admin")

Examples:
  yarn add-admin                                    # Interactive mode
  yarn add-admin user@email.com mypassword          # With email and password
  yarn add-admin user@email.com mypass "John Doe"   # With name
  yarn add-admin user@email.com mypass "John" admin # Full arguments

Options:
  -h, --help    Show this help message
`);
  process.exit(0);
}

addAdminUser();
