import React from "react"
import styled from "styled-components"
import PropTypes from "prop-types"
import theme from "styled-theming"

import Layout from "../components/layout"
import NavigationBtn from "../components/ui-kit/navigation-btn"
import CodeBlock from "../components/ui-kit/code-block"

const sectionBackgroundColor = theme.variants("mode", "kind", {
  primary: { light: "#fafafa", dark: "#555" },
  secondary: { light: "#fff", dark: "#333" },
  tertiary: { light: "#555", dark: "#aaa" },
})

const HomeSection = styled.div`
  background-color: ${sectionBackgroundColor};
  padding-top: 5rem;
  padding-bottom: 5rem;

  @media (min-width: 1200px) {
    padding-top: 7rem;
    padding-bottom: 7rem;
  }
`
HomeSection.propTypes = {
  kind: PropTypes.oneOf(["primary", "secondary", "tertiary"]).isRequired,
}
HomeSection.defaultProps = {
  kind: "primary",
}

const SectionContainer = styled.div`
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: ${props => props.alignment || "stretch"};
  text-align: ${props => props.content || "left"};

  @media (min-width: 768px) {
    flex-direction: ${props => props.direction || "column"};
  }

  @media (min-width: 992px) {
    max-width: 960px;
  }

  @media (min-width: 2000px) {
    max-width: 1140px;
  }
`

const PanelLeft = styled.div`
  @media (min-width: 768px) {
    margin-right: 1rem;
    width: calc(50% - 1rem);
  }
`

const PanelRight = styled.div`
  @media (min-width: 768px) {
    width: 50%;
  }
`

const HomeH1 = styled.h1`
  @media (min-width: 992px) {
    font-size: 3rem;
  }
`

const HomeH2 = styled.h2`
  @media (min-width: 576px) {
    font-size: 2rem;
  }
`

const HomeParagraph = styled.p`
  font-weight: 300;
`

const installationCode = `
# Install it globally
$ npm install occ-tools -g

# Or add it as a project dependency
$ npm install occ-tools --save
`

const IndexPage = () => (
  <Layout type="full">
    <HomeSection kind="primary">
      <SectionContainer alignment="center" content="center">
        <HomeH1>
          Your development more productive on the Oracle Commerce Cloud platform
        </HomeH1>
        <HomeParagraph>
          OCC Tools is a free and open source CLI application that makes easier
          to perform development tasks on the Oracle Commerce Cloud platform.
        </HomeParagraph>
        <NavigationBtn to="/docs/getting-started/">Get Started</NavigationBtn>
      </SectionContainer>
    </HomeSection>

    <HomeSection kind="secondary">
      <SectionContainer direction="row">
        <PanelLeft>
          <HomeH2>Installation</HomeH2>
          <p style={{ fontWeight: "500" }}>
            Install OCC Tools using NPM or Yarn.
          </p>
          <HomeParagraph>
            OCC Tools can also be installed as either a global package to make
            it available anyware, or as a project dependency so that you can
            have a better version control over what version your project is
            using.
          </HomeParagraph>
        </PanelLeft>
        <PanelRight>
          <CodeBlock codeBlock={installationCode} language="bash" />
        </PanelRight>
      </SectionContainer>
    </HomeSection>
  </Layout>
)

export default IndexPage
