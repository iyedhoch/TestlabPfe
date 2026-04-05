import { Platform } from '../generated/client';
import { prisma } from './client';

async function main() {
  // ─── 1️⃣ Création du projet, epics, features, userStories et environments ───
  const project = await prisma.project.create({
    data: {
      prefix: 'QA',
      name: 'QA Automation Platform',
      description: 'Plateforme de gestion des tests QA',
      clickupListId: '123456',
      platforms: [Platform.WEB, Platform.MOBILE],

      environment: {
        create: [
          {
            name: 'Development',
            url: 'https://dev.qa-platform.com',
            description: 'Environnement de développement',
            status: 'Projet',
            envItems: {
              create: [
                {
                  environmentKey: 'API_URL',
                  value: 'https://api-dev.qa-platform.com',
                },
                {
                  environmentKey: 'AUTH_URL',
                  value: 'https://auth-dev.qa-platform.com',
                },
              ],
            },
          },
          {
            name: 'Production',
            url: 'https://qa-platform.com',
            description: 'Environnement de production',
            status: 'Actif',
            envItems: {
              create: [
                {
                  environmentKey: 'API_URL',
                  value: 'https://api.qa-platform.com',
                },
              ],
            },
          },
        ],
      },

      epics: {
        create: [
          {
            name: 'Authentication',
            description: "Gestion de l'authentification",
            priority: 'HIGH',
            features: {
              create: [
                {
                  name: 'Login',
                  priority: 'HIGH',
                  userStories: {
                    create: [
                      {
                        name: 'User can login with email and password',
                        description:
                          "En tant qu'utilisateur je veux me connecter",
                        priority: 'HIGH',
                      },
                      {
                        name: 'User receives error when credentials invalid',
                        priority: 'MEDIUM',
                      },
                    ],
                  },
                },
                {
                  name: 'Password Reset',
                  priority: 'MEDIUM',
                  userStories: {
                    create: [
                      { name: 'User can request password reset email' },
                      { name: 'User can change password with token' },
                    ],
                  },
                },
              ],
            },
          },
          {
            name: 'Project Management',
            priority: 'MEDIUM',
            features: {
              create: [
                {
                  name: 'Create Project',
                  userStories: {
                    create: [
                      { name: 'User can create a new project' },
                      { name: 'User must provide project name' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Project créé :', project.id);

  // ─── 2️⃣ Création des TestSuites principales ───
  const authSuite = await prisma.testSuite.create({
    data: {
      name: 'Authentication Tests',
      order: 1,
      projectId: project.id,
    },
  });

  const projectSuite = await prisma.testSuite.create({
    data: {
      name: 'Project Tests',
      order: 2,
      projectId: project.id,
    },
  });

  // ─── 3️⃣ Création des TestCases pour Authentication Tests ───
  await prisma.testCase.create({
    data: {
      name: 'User Login Success',
      summary: 'User should login successfully',
      testSuiteId: authSuite.id,
      preconditions: {
        create: [
          { content: 'User account exists', order: 1 },
          { content: 'User is on login page', order: 2 },
        ],
      },
      steps: {
        create: [
          {
            action: 'Enter valid email',
            expectedResult: 'Email accepted',
            order: 1,
          },
          {
            action: 'Enter valid password',
            expectedResult: 'Password accepted',
            order: 2,
          },
          {
            action: 'Click login button',
            expectedResult: 'User redirected to dashboard',
            order: 3,
          },
        ],
      },
    },
  });

  await prisma.testCase.create({
    data: {
      name: 'Login with invalid password',
      summary: 'User should see error',
      testSuiteId: authSuite.id,
      steps: {
        create: [
          {
            action: 'Enter valid email',
            expectedResult: 'Email accepted',
            order: 1,
          },
          {
            action: 'Enter wrong password',
            expectedResult: 'Error displayed',
            order: 2,
          },
        ],
      },
    },
  });

  // ─── 4️⃣ Création d’une sous-suite Project Creation sous Project Tests ───
  const projectCreationSuite = await prisma.testSuite.create({
    data: {
      name: 'Project Creation',
      order: 1,
      projectId: project.id,
      parentId: projectSuite.id, // <-- parent explicite
    },
  });

  await prisma.testCase.create({
    data: {
      name: 'Create new project',
      summary: 'User creates project',
      testSuiteId: projectCreationSuite.id,
      steps: {
        create: [
          {
            action: 'Click create project',
            expectedResult: 'Form appears',
            order: 1,
          },
          {
            action: 'Fill project name',
            expectedResult: 'Name accepted',
            order: 2,
          },
          {
            action: 'Submit form',
            expectedResult: 'Project created',
            order: 3,
          },
        ],
      },
    },
  });

  console.log('Seed des TestSuites terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
