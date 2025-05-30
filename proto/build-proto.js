#!/usr/bin/env node

import * as fs from "fs/promises"
import * as path from "path"
import { execSync } from "child_process"
import { globby } from "globby"
import chalk from "chalk"

// Get script directory and root directory
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname)
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..")

async function main() {
	console.log(chalk.bold.blue("Starting Protocol Buffer code generation..."))

	// Check if protoc is installed and has the correct version
	try {
		const protocOutput = execSync("protoc --version", { encoding: "utf8" }).trim()
		console.log(chalk.cyan(`Found ${protocOutput}`))
		const versionMatch = protocOutput.match(/libprotoc\s+(\d+\.\d+)/)
		if (!versionMatch) {
			console.warn(chalk.yellow("Warning: Could not determine protoc version. Continuing anyway..."))
		} else {
			const version = versionMatch[1]
			const requiredVersion = "30.1.0" // Update to include patch version

			// Split versions and convert to numbers, default patch to 0 if not present
			const vParts = version.split(".").map(Number)
			const rParts = requiredVersion.split(".").map(Number)

			const vMajor = vParts[0]
			const vMinor = vParts[1]
			const vPatch = vParts[2] || 0 // Default to 0 if patch is missing

			const rMajor = rParts[0]
			const rMinor = rParts[1]
			const rPatch = rParts[2] || 0

			if (
				vMajor < rMajor ||
				(vMajor === rMajor && vMinor < rMinor) ||
				(vMajor === rMajor && vMinor === rMinor && vPatch < rPatch)
			) {
				console.warn(
					chalk.yellow(`Warning: protoc version ${version} found, but version ${requiredVersion} is required.`),
				)
				console.warn(
					chalk.yellow(
						`To install the correct version, visit: https://github.com/protocolbuffers/protobuf/releases/tag/v${requiredVersion}`,
					),
				)
				process.exit(0) // Exit with success as requested
			}
		}
	} catch (error) {
		console.warn(chalk.yellow("Warning: protoc is not installed. Skipping proto generation."))
		console.warn(
			chalk.yellow(
				"To install Protocol Buffers compiler, visit: https://github.com/protocolbuffers/protobuf/releases/tag/v30.1",
			),
		)
		process.exit(0) // Exit with success as requested
	}

	// Check if ts-proto plugin is available
	const TS_PROTO_PLUGIN = path.join(ROOT_DIR, "node_modules", ".bin", "protoc-gen-ts_proto")
	try {
		await fs.access(TS_PROTO_PLUGIN)
	} catch (error) {
		console.error(chalk.red("Error: ts-proto plugin not found at"), TS_PROTO_PLUGIN)
		console.error(chalk.red('Please run "npm install" to install the required dependencies.'))
		process.exit(1)
	}

	// Define output directories
	const TS_OUT_DIR = path.join(ROOT_DIR, "src", "shared", "proto")

	// Create output directory if it doesn't exist
	await fs.mkdir(TS_OUT_DIR, { recursive: true })

	// Clean up existing generated files
	console.log(chalk.cyan("Cleaning up existing generated TypeScript files..."))
	const existingFiles = await globby("**/*.ts", { cwd: TS_OUT_DIR })
	for (const file of existingFiles) {
		await fs.unlink(path.join(TS_OUT_DIR, file))
	}

	// Process all proto files
	console.log(chalk.cyan("Processing proto files from"), SCRIPT_DIR)
	const protoFiles = await globby("**/*.proto", { cwd: SCRIPT_DIR })

	for (const protoFile of protoFiles) {
		console.log(chalk.cyan(`Generating TypeScript code for ${protoFile}...`))

		// Build the protoc command with proper path handling for cross-platform
		const protocCommand = [
			"protoc",
			`--plugin=protoc-gen-ts_proto="${TS_PROTO_PLUGIN}"`,
			`--ts_proto_out="${TS_OUT_DIR}"`,
			"--ts_proto_opt=outputServices=generic-definitions,env=node,esModuleInterop=true,useDate=false,useOptionals=messages",
			`--proto_path="${SCRIPT_DIR}"`,
			`"${path.join(SCRIPT_DIR, protoFile)}"`,
		].join(" ")

		try {
			const execOptions = {
				stdio: "inherit",
			}
			execSync(protocCommand, execOptions)
		} catch (error) {
			console.error(chalk.red(`Error generating TypeScript for ${protoFile}:`), error)
			process.exit(1)
		}
	}

	console.log(chalk.green("Protocol Buffer code generation completed successfully."))
	console.log(chalk.green(`TypeScript files generated in: ${TS_OUT_DIR}`))

	// Generate method registration files
	await generateMethodRegistrations()

	// Make the script executable
	try {
		await fs.chmod(path.join(SCRIPT_DIR, "build-proto.js"), 0o755)
	} catch (error) {
		console.warn(chalk.yellow("Warning: Could not make script executable:"), error)
	}
}

async function generateMethodRegistrations() {
	console.log(chalk.cyan("Generating method registration files..."))

	const serviceDirs = [
		path.join(ROOT_DIR, "src", "core", "controller", "mcp"),
		path.join(ROOT_DIR, "src", "core", "controller", "browser"),
		path.join(ROOT_DIR, "src", "core", "controller", "checkpoints"),
		// Add more service directories here as needed
	]

	for (const serviceDir of serviceDirs) {
		try {
			await fs.access(serviceDir)
		} catch (error) {
			console.log(chalk.gray(`Skipping ${serviceDir} - directory does not exist`))
			continue
		}

		const serviceName = path.basename(serviceDir)
		const registryFile = path.join(serviceDir, "methods.ts")

		console.log(chalk.cyan(`Generating method registrations for ${serviceName}...`))

		// Get all TypeScript files in the service directory
		const files = await globby("*.ts", { cwd: serviceDir })

		// Filter out index.ts and methods.ts
		const implementationFiles = files.filter((file) => file !== "index.ts" && file !== "methods.ts")

		// Create the output file with header
		let content = `// AUTO-GENERATED FILE - DO NOT MODIFY DIRECTLY
// Generated by proto/build-proto.js

// Import all method implementations
import { registerMethod } from "./index"\n`

		// Add imports for all implementation files
		for (const file of implementationFiles) {
			const baseName = path.basename(file, ".ts")
			content += `import { ${baseName} } from "./${baseName}"\n`
		}

		// Add registration function
		content += `\n// Register all ${serviceName} service methods
export function registerAllMethods(): void {
\t// Register each method with the registry\n`

		// Add registration statements
		for (const file of implementationFiles) {
			const baseName = path.basename(file, ".ts")
			content += `\tregisterMethod("${baseName}", ${baseName})\n`
		}

		// Close the function
		content += `}`

		// Write the file
		await fs.writeFile(registryFile, content)
		console.log(chalk.green(`Generated ${registryFile}`))
	}

	console.log(chalk.green("Method registration files generated successfully."))
}

// Run the main function
main().catch((error) => {
	console.error(chalk.red("Error:"), error)
	process.exit(1)
})
