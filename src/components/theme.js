import theme from "styled-theming"

const defaultColor = { light: "#333", dark: "#eee" }

export const backgroundColor = theme("mode", {
  light: "#fff",
  dark: "#222",
})

export const foregroundColor = theme("mode", defaultColor)

export const colors = theme.variants("mode", "type", {
  primary: { light: "#004de6", dark: "#004de6" },
})
