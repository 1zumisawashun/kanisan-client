import { Configuration, DefinePlugin } from "webpack";
import * as path from "path";
import * as GasPlugin from "gas-webpack-plugin";
import * as CopyPlugin from "copy-webpack-plugin";
import * as dotenv from "dotenv";

const env = dotenv.config().parsed;

const config: Configuration = {
  entry: "./src/main.ts",
  mode: "production",
  output: {
    filename: "main.js",
    path: path.join(__dirname, "dist"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new GasPlugin(),
    new CopyPlugin({
      patterns: [{ from: "./src/appsscript.json" }],
    }),
    new DefinePlugin({
      "process.env": JSON.stringify(env),
    }),
  ],
};

export default config;
