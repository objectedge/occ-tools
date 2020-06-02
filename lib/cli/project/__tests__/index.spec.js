// const mockFs = require('mock-fs')
// const { validateOccProject, validateProjectDescriptor, getProjectDescriptor } = require('../index')

// beforeAll(() => {
//   mockFs({
//     '/occ-projects': {
//       'empty-project': {},
//       'project-with-invalid-descriptor': {
//         'occ-tools.project.json': '{ "name": "My Project" }',
//       },
//       'my-project': {
//         'occ-tools.project.json':
//           '{ "name": "My Project", "environments": [ { "name": "dev", "url": "https://dev.environment.com" } ] }',
//       },
//     },
//   })
// })

// afterAll(() => {
//   mockFs.restore()
// })

// it('should be a invalid descriptor if project name is missing', () => {
//   expect(() => validateProjectDescriptor({})).toThrow('Missing project name.')
// })

// it('should be a invalid descriptor if no environments are set', () => {
//   expect(() => validateProjectDescriptor({ name: 'My Project' })).toThrow('No OCC environments defined.')
// })

// it('should be a valid descriptor if all conditions are met', () => {
//   expect(() =>
//     validateProjectDescriptor({
//       name: 'My Project',
//       environments: [{ name: 'dev', url: 'https://dev.environment.com' }],
//     })
//   ).not.toThrow()
// })

// it('getting descriptor should return null if the descriptor file is not found in the project folder', async () => {
//   await expect(getProjectDescriptor('/occ-projects/empty-project')).resolves.toBeNull()
// })

// it('should return the descriptor if its file is present on project folder', async () => {
//   await expect(getProjectDescriptor('/occ-projects/my-project')).resolves.toEqual({
//     environments: [{ name: 'dev', url: 'https://dev.environment.com' }],
//     name: 'My Project',
//   })
// })

// it('should be a invalid occ project if descriptor file is missing', async () => {
//   await expect(validateOccProject('/occ-projects/empty-project')).rejects.toThrow('Missing project descriptor.')
// })

// it('should be a invalid occ project if descriptor is not valid', async () => {
//   await expect(validateOccProject('/occ-projects/project-with-invalid-descriptor')).rejects.toThrow(
//     'Invalid project descriptor. No OCC environments defined.'
//   )
// })

// it('should be a valid occ project if all conditions are met', async () => {
//   await expect(validateOccProject('/occ-projects/my-project')).resolves
// })
