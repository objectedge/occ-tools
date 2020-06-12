import theme from "styled-theming"

const defaultColor = { light: "#333", dark: "#eee" }

export const colorPallete = {
  primary: "#004de6",
  info: "#2196f3"
}

export const backgroundColor = theme("mode", {
  light: "#fff",
  dark: "#222",
})

export const foregroundColor = theme("mode", defaultColor)

export const colors = theme.variants("mode", "type", {
  primary: { light: colorPallete.primary, dark: colorPallete.primary },
  info: { light: colorPallete.info, dark: colorPallete.info },
})
