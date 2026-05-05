const COUNTRY_NAME_TO_CODE: Record<string, string> = {
	'AFGHANISTAN': 'AF', 'ALBANIA': 'AL', 'ALGERIA': 'DZ', 'ANDORRA': 'AD', 'ANGOLA': 'AO',
	'ANTIGUA AND BARBUDA': 'AG', 'ARGENTINA': 'AR', 'ARMENIA': 'AM', 'AUSTRALIA': 'AU',
	'AUSTRIA': 'AT', 'AZERBAIJAN': 'AZ', 'BAHAMAS': 'BS', 'BAHRAIN': 'BH', 'BANGLADESH': 'BD',
	'BARBADOS': 'BB', 'BELARUS': 'BY', 'BELGIUM': 'BE', 'BELIZE': 'BZ', 'BENIN': 'BJ',
	'BHUTAN': 'BT', 'BOLIVIA': 'BO', 'BOSNIA AND HERZEGOVINA': 'BA', 'BOTSWANA': 'BW',
	'BRAZIL': 'BR', 'BRUNEI': 'BN', 'BULGARIA': 'BG', 'BURKINA FASO': 'BF', 'BURUNDI': 'BI',
	'CABO VERDE': 'CV', 'CAMBODIA': 'KH', 'CAMEROON': 'CM', 'CANADA': 'CA',
	'CENTRAL AFRICAN REPUBLIC': 'CF', 'CHAD': 'TD', 'CHILE': 'CL', 'CHINA': 'CN',
	'COLOMBIA': 'CO', 'COMOROS': 'KM', 'CONGO': 'CG',
	'DEMOCRATIC REPUBLIC OF THE CONGO': 'CD', 'COSTA RICA': 'CR', 'CROATIA': 'HR', 'CUBA': 'CU',
	'CYPRUS': 'CY', 'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ', 'DENMARK': 'DK', 'DJIBOUTI': 'DJ',
	'DOMINICA': 'DM', 'DOMINICAN REPUBLIC': 'DO', 'ECUADOR': 'EC', 'EGYPT': 'EG',
	'EL SALVADOR': 'SV', 'EQUATORIAL GUINEA': 'GQ', 'ERITREA': 'ER', 'ESTONIA': 'EE',
	'ESWATINI': 'SZ', 'ETHIOPIA': 'ET', 'FIJI': 'FJ', 'FINLAND': 'FI', 'FRANCE': 'FR',
	'GABON': 'GA', 'GAMBIA': 'GM', 'GEORGIA': 'GE', 'GERMANY': 'DE', 'GHANA': 'GH',
	'GREECE': 'GR', 'GRENADA': 'GD', 'GUATEMALA': 'GT', 'GUINEA': 'GN', 'GUINEA-BISSAU': 'GW',
	'GUYANA': 'GY', 'HAITI': 'HT', 'HONDURAS': 'HN', 'HUNGARY': 'HU', 'ICELAND': 'IS',
	'INDIA': 'IN', 'INDONESIA': 'ID', 'IRAN': 'IR', 'IRAQ': 'IQ', 'IRELAND': 'IE',
	'ISRAEL': 'IL', 'ITALY': 'IT', 'IVORY COAST': 'CI', "COTE D'IVOIRE": 'CI',
	'JAMAICA': 'JM', 'JAPAN': 'JP', 'JORDAN': 'JO', 'KAZAKHSTAN': 'KZ', 'KENYA': 'KE',
	'KIRIBATI': 'KI', 'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'KUWAIT': 'KW', 'KYRGYZSTAN': 'KG',
	'LAOS': 'LA', 'LATVIA': 'LV', 'LEBANON': 'LB', 'LESOTHO': 'LS', 'LIBERIA': 'LR',
	'LIBYA': 'LY', 'LIECHTENSTEIN': 'LI', 'LITHUANIA': 'LT', 'LUXEMBOURG': 'LU',
	'MADAGASCAR': 'MG', 'MALAWI': 'MW', 'MALAYSIA': 'MY', 'MALDIVES': 'MV', 'MALI': 'ML',
	'MALTA': 'MT', 'MARSHALL ISLANDS': 'MH', 'MAURITANIA': 'MR', 'MAURITIUS': 'MU',
	'MEXICO': 'MX', 'MÉXICO': 'MX', 'MICRONESIA': 'FM', 'MOLDOVA': 'MD', 'MONACO': 'MC',
	'MONGOLIA': 'MN', 'MONTENEGRO': 'ME', 'MOROCCO': 'MA', 'MOZAMBIQUE': 'MZ', 'MYANMAR': 'MM',
	'NAMIBIA': 'NA', 'NAURU': 'NR', 'NEPAL': 'NP', 'NETHERLANDS': 'NL', 'NEW ZEALAND': 'NZ',
	'NICARAGUA': 'NI', 'NIGER': 'NE', 'NIGERIA': 'NG', 'NORTH MACEDONIA': 'MK',
	'NORWAY': 'NO', 'OMAN': 'OM', 'PAKISTAN': 'PK', 'PALAU': 'PW', 'PALESTINE': 'PS',
	'PANAMA': 'PA', 'PAPUA NEW GUINEA': 'PG', 'PARAGUAY': 'PY', 'PERU': 'PE',
	'PHILIPPINES': 'PH', 'POLAND': 'PL', 'PORTUGAL': 'PT', 'QATAR': 'QA', 'ROMANIA': 'RO',
	'RUSSIA': 'RU', 'RUSSIAN FEDERATION': 'RU', 'RWANDA': 'RW',
	'SAINT KITTS AND NEVIS': 'KN', 'SAINT LUCIA': 'LC', 'SAINT VINCENT AND THE GRENADINES': 'VC',
	'SAMOA': 'WS', 'SAN MARINO': 'SM', 'SAO TOME AND PRINCIPE': 'ST', 'SAUDI ARABIA': 'SA',
	'SENEGAL': 'SN', 'SERBIA': 'RS', 'SEYCHELLES': 'SC', 'SIERRA LEONE': 'SL',
	'SINGAPORE': 'SG', 'SLOVAKIA': 'SK', 'SLOVENIA': 'SI', 'SOLOMON ISLANDS': 'SB',
	'SOMALIA': 'SO', 'SOUTH AFRICA': 'ZA', 'SOUTH SUDAN': 'SS', 'SPAIN': 'ES',
	'SRI LANKA': 'LK', 'SUDAN': 'SD', 'SURINAME': 'SR', 'SWEDEN': 'SE', 'SWITZERLAND': 'CH',
	'SYRIA': 'SY', 'TAIWAN': 'TW', 'TAJIKISTAN': 'TJ', 'TANZANIA': 'TZ', 'THAILAND': 'TH',
	'TIMOR-LESTE': 'TL', 'TOGO': 'TG', 'TONGA': 'TO', 'TRINIDAD AND TOBAGO': 'TT',
	'TUNISIA': 'TN', 'TURKEY': 'TR', 'TÜRKIYE': 'TR', 'TURKMENISTAN': 'TM', 'TUVALU': 'TV',
	'UGANDA': 'UG', 'UKRAINE': 'UA', 'UNITED ARAB EMIRATES': 'AE', 'UAE': 'AE',
	'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB', 'ENGLAND': 'GB',
	'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US', 'USA': 'US',
	'URUGUAY': 'UY', 'UZBEKISTAN': 'UZ', 'VANUATU': 'VU', 'VATICAN CITY': 'VA',
	'VENEZUELA': 'VE', 'VIETNAM': 'VN', 'VIET NAM': 'VN', 'YEMEN': 'YE', 'ZAMBIA': 'ZM',
	'ZIMBABWE': 'ZW',
	'HONG KONG': 'HK', 'MACAU': 'MO', 'PUERTO RICO': 'PR', 'GUAM': 'GU',
	'US VIRGIN ISLANDS': 'VI', 'AMERICAN SAMOA': 'AS',
};

/**
 * Resolves a country value to an ISO 3166-1 alpha-2 code.
 * Accepts either a 2-letter code (passed through) or a full country name.
 * Returns the input uppercased if no mapping is found.
 */
export function resolveCountryCode(country: string): string {
	const upper = country.trim().toUpperCase();
	if (upper.length === 2) return upper;
	return COUNTRY_NAME_TO_CODE[upper] ?? upper;
}

const US_STATE_TO_CODE: Record<string, string> = {
	'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
	'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
	'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
	'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
	'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
	'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH',
	'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC',
	'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA',
	'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN',
	'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA',
	'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
	'DISTRICT OF COLUMBIA': 'DC', 'PUERTO RICO': 'PR', 'GUAM': 'GU',
	'AMERICAN SAMOA': 'AS', 'US VIRGIN ISLANDS': 'VI',
};

const CA_PROVINCE_TO_CODE: Record<string, string> = {
	'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB', 'NEW BRUNSWICK': 'NB',
	'NEWFOUNDLAND AND LABRADOR': 'NL', 'NEWFOUNDLAND': 'NL', 'NOVA SCOTIA': 'NS',
	'NORTHWEST TERRITORIES': 'NT', 'NUNAVUT': 'NU', 'ONTARIO': 'ON',
	'PRINCE EDWARD ISLAND': 'PE', 'QUEBEC': 'QC', 'QUÉBEC': 'QC',
	'SASKATCHEWAN': 'SK', 'YUKON': 'YT',
};

/**
 * Resolves a state/province value to a short code.
 * Accepts a 2-letter code (passed through) or full name for US states / CA provinces.
 */
export function resolveStateCode(state: string, country?: string): string {
	const trimmed = state.trim();
	if (trimmed.length <= 2) return trimmed.toUpperCase();
	const upper = trimmed.toUpperCase();
	return US_STATE_TO_CODE[upper] ?? CA_PROVINCE_TO_CODE[upper] ?? trimmed;
}
