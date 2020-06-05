import React from "react"
import styled from "styled-components"

import Layout from "../components/layout"
import SEO from "../components/seo"
import NavigationBtn from "../components/ui-kit/NavigationBtn"

const MainSection = styled.div`
  background-image: linear-gradient(180deg,#fafafa,#fafafa);
  padding-top: 5rem;
  padding-bottom: 5rem;

  @media(min-width: 1200px) {
    padding-top: 7rem;
    padding-bottom: 7rem;
  }
`
const HomeContainer = styled.div`
  width: 80%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media(min-width: 768px) {
    width: 70%;
  }

  @media(min-width: 1200px) {
    width: 50%;
  }
`

const HomeTitle = styled.h1`
  text-align: center;
  font-size: 1.8rem;
  letter-spacing: .3px;
  font-weight: 500;
  margin-top: 0;

  @media(min-width: 768px) {
    font-size: 2.2rem;
  }

  @media(min-width: 992px) {
    font-size: 2.5rem;
  }
`

const HomeSubTitle = styled.p`
  text-align: center;
  font-size: 1rem;
  width: 80%;
`

const IndexPage = () => (
  <Layout type="full">
    <SEO title="Home" />

    <MainSection>
      <HomeContainer>
        <HomeTitle>Your development more productive on the Oracle Commerce Cloud platform</HomeTitle>
        <HomeSubTitle>OCC Tools is a free and open source CLI application that makes easier to perform development tasks on the Oracle Commerce Cloud platform.</HomeSubTitle>
        <NavigationBtn to="/docs/getting-started/">Get Started</NavigationBtn>
      </HomeContainer>
    </MainSection>
  </Layout>
)

export default IndexPage
