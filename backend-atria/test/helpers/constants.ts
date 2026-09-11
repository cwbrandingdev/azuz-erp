/** Fixed E2E identities — recreated at the start of each test run */
export const E2E_RUN_ID = process.env.E2E_RUN_ID ?? 'e2e-suite';

export const TEST_ADMIN = {
  email: 'e2e-admin@atria.test',
  password: 'E2eAdmin!Pass123',
  name: 'E2E Admin',
};

export const TEST_CLIENT_USER = {
  email: 'e2e-client@atria.test',
  password: 'E2eClient!Pass123',
  name: 'E2E Client User',
};

export const TEST_DESIGNER = {
  email: 'e2e-designer@atria.test',
  password: 'E2eDesigner!Pass123',
  name: 'E2E Designer Junior',
};

export const TEST_DESIGNER_MASTER = {
  email: 'e2e-designer-master@atria.test',
  password: 'E2eDesignerMaster!Pass123',
  name: 'E2E Designer Master',
};

export const TEST_COMPANY_NAME = `E2E Company ${E2E_RUN_ID}`;
