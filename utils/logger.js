//utils/logger.js

// Logger customizado com níveis de log e cores no terminal
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
  SUCCESS: 5
};

// Define o nível de log padrão baseado na variável de ambiente
const defaultLevel =
  process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;

// Cores ANSI para terminal
const colors = {
  RESET: "\x1b[0m",
  GRAY: "\x1b[90m",
  BLUE: "\x1b[34m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m"
};

// Formata data DD/MM/YYYY HH:MM:SS
function formatDate(date = new Date()) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
}

// Pega a linha/arquivo real que chamou o logger (ignora o próprio logger)
function getCallerInfo() {
  const stack = new Error().stack.split("\n").slice(2); // remove Error + getCallerInfo
  for (let line of stack) {
    if (!line.includes("logger.js")) { // ignora todas as linhas do logger
      const match = line.match(/\(?([^\s()]+):(\d+):(\d+)\)?$/);
      if (match) {
        const filePath = match[1].split(/[/\\]/).slice(-2).join("/"); // pasta/arquivo.js
        const lineNumber = match[2];
        return `${filePath}:${lineNumber}`;
      }
    }
  }
  return "unknown";
}

class Logger {
  constructor(level = defaultLevel) {
    this.level = level;
  }
  
  // Formata a mensagem de log
  format(level, color, args) {
    const timestamp = formatDate();
    const location = getCallerInfo();
    
    // Processa cada argumento para converter objetos em strings JSON
    const formattedArgs = args.map(arg => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(" ");
    
    return `${color}${timestamp} [${level}] (${location})${colors.RESET} - ${formattedArgs}`;
  }

  debug(...args) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format("DEBUG", colors.GRAY, args));
    }
  }

  success(...args) {
    if (this.level <= LogLevel.INFO) {
      console.log(this.format("SUCCESS", colors.GREEN, args));
    }
  }

  info(...args) {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format("INFO", colors.BLUE, args));
    }
  }

  warn(...args) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format("WARN", colors.YELLOW, args));
    }
  }

  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format("ERROR", colors.RED, args));
    }
  }

  setLevel(level) {
    this.level = level;
  }
}

// Instância única do logger
const logger = new Logger();

export { logger, LogLevel };
