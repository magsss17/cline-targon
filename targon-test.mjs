import https from "https"
import axios from "axios"

const TARGON_API_KEY = ""

const agent = new https.Agent({
	servername: "api.targon.ai",
	rejectUnauthorized: true, // enable proper cert checks
})
console.log("Agent SNI:", agent.options.servername)

const res = await axios.post(
	"https://api.targon.com/v1/chat/completions",
	{
		model: "deepseek-ai/DeepSeek-R1",
		messages: [{ role: "user", content: "Say hello from inside Cline!" }],
		stream: false,
	},
	{
		headers: {
			Authorization: `Bearer ${TARGON_API_KEY}`,
			"Content-Type": "application/json",
		},
		httpsAgent: agent,
	},
)
