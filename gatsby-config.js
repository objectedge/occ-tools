module.exports = {
  pathPrefix: `/occ-tools`,
  siteMetadata: {
    title: `OCC Tools`,
    description:
      "Object Edge tools for development tasks automation on Oracle Commerce Cloud platform.",
    author: "Object Edge",
    sidebarMenu: [
      { title: "Introduction", slug: "/docs/" },
      { title: "Getting Started", slug: "/docs/getting-started/" },
      {
        title: "User Guide",
        slug: "/docs/user-guide/",
        children: [
          {
            title: "Commands Reference",
            slug: "/docs/user-guide/commands-reference/",
          },
        ],
      },
      { title: "Developer Guide", slug: "/docs/developer-guide/", children: [
        { title: "Project Structure", slug: "/docs/developer-guide/project-structure/" }
      ] },
      { title: "API", slug: "/docs/api/" },
    ],
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: `${__dirname}/src/pages/`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    `gatsby-plugin-styled-components`,
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        defaultLayouts: {
          pages: require.resolve("./src/components/layout.js"),
        },
      },
    },
    {
      resolve: `gatsby-plugin-favicon`,
      options: {
        logo: "./src/images/favicon.png",
      },
    },
  ],
}
