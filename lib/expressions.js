const XRegExp = require('xregexp');

const REX_LISTUNIX = XRegExp('^(?<type>[\\-ld])(?<permission>([\\-r][\\-w][\\-xstT]){3})(?<acl>(\\+))?\\s+(?<inodes>\\d+)\\s+(?<owner>\\S+)\\s+(?<group>\\S+)\\s+(?<size>\\d+)\\s+(?<timestamp>((?<month1>\\w{3})\\s+(?<date1>\\d{1,2})\\s+(?<hour>\\d{1,2}):(?<minute>\\d{2}))|((?<month2>\\w{3})\\s+(?<date2>\\d{1,2})\\s+(?<year>\\d{4})))\\s+(?<name>.+)$');

const REX_LISTMSDOS = XRegExp('^(?<month>\\d{2})(?:\\-|\\/)(?<date>\\d{2})(?:\\-|\\/)(?<year>\\d{2,4})\\s+(?<hour>\\d{2}):(?<minute>\\d{2})\\s{0,1}(?<ampm>[AaMmPp]{1,2})\\s+(?:(?<size>\\d+)|(?<isdir>\\<DIR\\>))\\s+(?<name>.+)$');

const REX_TIMEVAL = XRegExp('^(?<year>\\d{4})(?<month>\\d{2})(?<date>\\d{2})(?<hour>\\d{2})(?<minute>\\d{2})(?<second>\\d+)(?:.\\d+)?$');

const RE_PASV = /([\d]+),([\d]+),([\d]+),([\d]+),([-\d]+),([-\d]+)/;
const RE_EPSV = /([\d]+)/;
const RE_WD = /"(.+)"(?: |$)/;
const RE_SYST = /^([^ ]+)(?: |$)/;

const RE_ENTRY_TOTAL = /^total/;
const RE_RES_END = /(?:^|\r?\n)(\d{3}) [^\r\n]*\r?\n/;
const RE_EOL = /\r?\n/g;
const RE_DASH = /-/g;
const RE_SEP = /;/g;
const RE_EQ = /=/;

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const RETVAL = {
  PRELIM: 1,
  OK: 2,
  WAITING: 3,
  ERR_TEMP: 4,
  ERR_PERM: 5,
};

const BYTES_NOOP = Buffer.from('NOOP\r\n');

const PARSE_DATE = (message) => {
  const v = XRegExp.exec(message, REX_TIMEVAL);

  if (!v) return false;

  return new Date(`${v.year}-${v.month}-${v.date}T${v.hour}:${v.minute}:${v.second}`);
};

/**
 * Parse Passive Mode FTP server IPv4 response
 */
const PARSE_IPV4_PASV = (message) => {
  const m = RE_PASV.exec(message);

  if (!m) return false;

  return {
    ip: [m[1], m[2], m[3], m[4]].join('.'),
    port: (parseInt(m[5], 10) * 256) + parseInt(m[6], 10),
  };
};

/**
 * Parse Extended Passive Mode FTP server IPv4 response
 */
const PARSE_IPV4_EPSV = (message, remoteAddress) => {
  const m = RE_EPSV.exec(message);

  if (!m) return false;

  const tcpPrt = m[0];

  if (!tcpPrt) return false;

  return {
    ip: remoteAddress,
    port: tcpPrt,
  };
};

const PARSE_IPV4_ACTIVE = (address) => {
  const p1 = Math.floor(address.port / 256);
  const p2 = address.port % 256;

  return { p1, p2 };
};

const PARSER_IP = {
  PARSE_IPV4_PASV,
  PARSE_IPV4_EPSV,
  PARSE_IPV4_ACTIVE,
};

module.exports = {
  REX_LISTUNIX,
  REX_LISTMSDOS,
  REX_TIMEVAL,
  RE_PASV,
  RE_EPSV,
  RE_WD,
  RE_SYST,
  RE_ENTRY_TOTAL,
  RE_RES_END,
  RE_EOL,
  RE_DASH,
  RE_SEP,
  RE_EQ,
  MONTHS,
  RETVAL,
  BYTES_NOOP,
  PARSE_DATE,
  PARSE_IPV4_PASV,
  PARSE_IPV4_EPSV,
  PARSE_IPV4_ACTIVE,
  PARSER_IP,
};
