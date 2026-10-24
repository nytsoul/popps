import { px } from "../lib/format";
import type {
  Country, FabricFamily, GarmentKind, HandloomZone, Occasion, RegionInfo, Technique, TechniqueGroup, Variety, VarietyStatus, Zone,
} from "../types";

/* ---------------------------------------------------------------------------
   Image library (licensed stock photography via Pexels).
   These are REPRESENTATIVE styling images — never proof of a specific weave.
--------------------------------------------------------------------------- */
export const IMG = {
  // saree portraits
  forest: 14205210, blueIndoor: 38966362, kolkataLights: 19119323, greenTemple: 34621854,
  redGoldSeated: 17468599, orangeMarket: 28943484, dyeFactory: 35359952, ornate: 17152210,
  keralaPortrait: 37706758, ornateOutdoor: 38796458, whiteBlack: 13454130, bwDisplay: 37708266,
  outdoorGrace: 14664844, blackPattern: 29172765, bangladeshReading: 39365089, tealFlat: 39866206,
  redFlat: 39866194, purpleBrick: 7326221, redArchway: 31450180, durgaPuja: 39641895,
  bengaliFestival: 33865784, bengaliBride: 38642754, howrah: 33865783, durgaJoy: 29054685,
  motherDaughter: 33839482, keralaJasmine: 28752502, greenCorridor: 34673465, keralaBride: 37706841,
  // editorial model portraits (licensed stock)
  modelGold: 35108765, modelSmile: 35108816, modelGrace: 35108778, modelBlack: 33600246,
  modelBlack2: 33616291, modelPink: 4048041, modelWhite: 28537268, modelPose: 29172779,
  modelBlue: 36024072, modelGarden: 40407331, modelVibrant: 30566440, modelRedGold: 17468599,
  modelGlasses: 17468608,
  jasmineBride: 37442983, goldenTN: 37706639, greenTemple2: 34474047, vibrant: 28943670,
  warmGlow: 39164375, byTree: 37054318, studio: 6842791, patterned: 39605936, poolside: 7686285,
  blueSari: 39219038, poolAttire: 37661456, jewellery: 36818405, brideWindow: 17001511,
  brideRed: 29396108, twoBrides: 27212189, brideHistoric: 38526712, bridalCloseup: 33101418,
  // international
  balinese: 31737266, malayCouple: 35336191, indonesian: 32027615, batikWomen: 32232887,
  javanese: 38683407, centralJava: 36400870,
  // textures
  goldFabric: 36299798, goldSatin: 4938324, brownPleat: 4938321, floralEmb: 3339215,
  blueSequin: 6275995, blueGoldSilk: 7676340, rolls: 36516572, blueFabric: 8754273,
  beigeFold: 7232405, beigeLinen: 4862928, whiteFabric: 7087672, greenLinen: 11733651, beigeCotton: 7232397,
  // looms & craft
  loom: 6332002, loom2: 6332015, handsBW: 23494589, weaving: 29848182, threads: 6634602,
  handLoom: 37892690, villageLoom: 24738158,
  // festive
  diwali: 18376972, pujaThali: 38920473, chhath: 34485933, marigold: 8887086,
} as const;

export const img = (id: number, w = 700, h = 933) => px(id, w, h);

/* ---------------------------------------------------------------------------
   Variety catalogue
   Format:  "# State ; Zone ; Country"
            "Name | fabrics | techniques | occasions | blurb | flags"
   flags:   inspired · ensemble · drape · aka:Alias/Alias
   This starter list is broad but NOT exhaustive — add lines to extend it.
--------------------------------------------------------------------------- */
const RAW = `
# Tamil Nadu ; South India ; India
Kanchipuram Silk | Silk | Handloom,Zari Work,Temple Border,Brocade | Wedding,Festive,Ceremony | Lustrous mulberry silk with contrast borders, traditionally interlocked using the korvai technique. | aka:Kanjivaram,Kancheepuram
Arni Silk | Silk | Handloom,Zari Work | Festive,Ceremony | Lighter silks from Arni, known for compact motifs and a softer drape. | aka:Arni
Thirubuvanam Silk | Silk | Handloom,Zari Work | Wedding,Festive | Silks from Thirubuvanam, admired for fine zari detailing. | aka:Thirubuvanam
Salem Silk | Silk | Handloom | Festive,Office | Soft, light silks with simple borders, easy to wear for long days. | aka:Salem
Chettinad Cotton | Cotton | Handloom | Everyday,Office | Bold checks and stripes in sturdy, breathable handloom cotton.
Madurai Sungudi | Cotton | Tie-Dye,Block Print | Everyday,Summer | Fine dotted patterns created by tying and resist-dyeing cotton. | aka:Sungudi,Madurai
Kovai Cotton-Silk | Silk-Cotton | Handloom | Office,Everyday | Coimbatore's light cotton-silk blends with subtle zari borders. | aka:Coimbatore Silk,Coimbatore,Kovai Kora,Kovai Kora
Koorainadu | Cotton,Silk-Cotton | Handloom | Ceremony | Traditional checked weaves from near Mayiladuthurai, worn for rituals.
Paramakudi Cotton | Cotton | Handloom | Everyday | Fine-count cotton with contrast borders from Paramakudi. | aka:Paramakudi
Karaikudi Kandangi | Cotton | Handloom | Everyday,Ceremony | Thick, temple-checked cotton in bold colour blocks from Chettinad. | aka:Chettinadu,Chettinad
Kodalikaruppur | Cotton | Brocade,Hand Painted | Ceremony | A historic royal textile combining woven brocade with hand-painted motifs. | aka:Dindigul
Kanchi Cotton | Cotton | Handloom | Everyday,Office | Fine cotton of Kanchipuram's weaving tradition — lighter than its silk namesake. | aka:Kancheepuram Cotton
Ponnur Cotton | Cotton | Handloom | Everyday | Cotton saree from Ponnur, Tamil Nadu. | aka:Ponnur
Woraiyur Cotton | Cotton | Handloom | Everyday,Ceremony | Cotton handloom from Woraiyur, Tamil Nadu. | aka:Woraiyur
Aruppukottai Cotton | Cotton | Handloom | Everyday | Cotton saree from Aruppukottai, a historic cotton-weaving town. | aka:Aruppukottai
Vilandai Cotton | Cotton | Handloom | Everyday | Cotton handloom from Vilandai, Tamil Nadu. | aka:Vilandai
Chedi Butta | Cotton,Silk | Handloom | Festive | Tamil Nadu saree with woven butta motifs.
Negamam Cotton | Cotton | Handloom | Everyday,Office | Cotton saree from Negamam, Tamil Nadu. | aka:Negamam
# Andhra Pradesh ; South India ; India
Uppada Jamdani | Silk | Jamdani,Zari Work | Wedding,Festive | Featherlight silk with jamdani motifs woven in by hand on the loom.
Venkatagiri | Cotton | Handloom,Jamdani,Zari Work | Office,Festive | Very fine cotton with jamdani-style buttas and zari borders.
Mangalagiri | Cotton | Handloom,Zari Work | Everyday,Office | Crisp cotton with nizam borders and a gentle sheen.
Dharmavaram Pattu | Silk | Handloom,Zari Work,Brocade | Wedding | Heavy bridal silks with broad gold borders and rich pallus. | aka:Dharmavaram
Ponduru Khadi | Khadi | Handloom | Everyday,Summer | Hand-spun, hand-woven khadi from Ponduru, famously fine and soft.
Guntur Cotton | Cotton | Handloom | Everyday | Everyday handloom cotton with simple borders.
Chirala Cotton | Cotton | Handloom | Everyday | Light coastal cotton sarees, often in checks. | aka:Chirala
Kuppadam | Cotton | Hand Painted | Festive,Contemporary | Hand-painted cotton of the Kuppadam kalamkari tradition, Andhra Pradesh. | aka:Kuppadam Kalamkari
Madhavaram | Silk,Cotton | Handloom | Festive | Saree of the Madhavaram weaving tradition, Andhra Pradesh.
Polavaram | Cotton | Handloom | Everyday,Ceremony | Cotton handloom from the Polavaram region, Andhra Pradesh.
Bobbili | Silk-Cotton | Handloom | Festive | Silk-cotton saree from Bobbili, Andhra Pradesh.
Payakaraopet | Cotton | Hand Painted | Festive | Hand-painted cotton associated with the Payakaraopet kalamkari cluster.
Bandarulanka | Cotton | Handloom | Everyday | Cotton handloom from Bandarulanka, Andhra Pradesh.
Paturu Cotton Silk | Silk-Cotton | Handloom | Office,Festive | Cotton-silk handloom from Paturu, Andhra Pradesh. | aka:Paturu
# Telangana ; South India ; India
Pochampally Ikat | Silk,Silk-Cotton,Cotton | Ikat | Festive,Office | Geometric ikat where yarns are tie-dyed before weaving.
Pochampally Double Ikat | Silk | Double Ikat | Festive,Wedding | Both warp and weft resist-dyed — demanding, precise and rare.
Gadwal | Silk-Cotton | Handloom,Zari Work,Temple Border | Wedding,Festive | Cotton body with silk borders and pallu, joined by interlocked weft. | aka:Gadwal Silk
Narayanpet | Cotton,Silk | Handloom,Temple Border | Everyday,Festive | Checked bodies with temple-style borders; also woven in Maharashtra. | aka:Narayan Peth
Siddipet Gollabhama | Cotton | Handloom,Butidar | Everyday,Ceremony | Cotton sarees with motifs of a milkmaid figure woven in. | aka:Gollabamma,Siddipet Gollabamma
Telia Rumal | Cotton | Handloom,Ikat | Festive,Ceremony | Oil-treated cotton with resist-dyed checks from Telangana, historically traded across West Asia. | aka:Telia Rumal
Armoor Silk | Silk | Handloom | Festive | Silk sarees woven in Armoor, Telangana.
Kothakota Silk | Silk | Handloom | Festive | Silk of the Kothakota weaving tradition, Telangana. | aka:Kotakota,Kothakota
Mahadevpur Tassar | Tussar | Handloom | Office,Festive | Tussar silk from Mahadevpur, Telangana. | aka:Mahadevpur Tussar
Linen Ikat | Linen | Ikat | Summer,Office | Linen with ikat patterning from Telangana.
Muthyampeta Cotton | Cotton | Handloom | Everyday | Cotton handloom from Muthyampeta, Telangana. | aka:Muthiyampeta,Muthyampeta
Ramappa | Cotton,Silk | Handloom,Temple Border | Ceremony,Festive | Saree tradition named for the Ramappa temple town of Warangal.
# Karnataka ; South India ; India
Mysore Silk | Silk | Zari Work | Wedding,Festive,Office | Smooth crepe-silk with pure zari, minimal motifs and a soft sheen.
Ilkal | Cotton,Silk-Cotton | Handloom,Temple Border | Everyday,Ceremony | Distinctive kondi-joined pallu with red-and-white tope teni patterns.
Molakalmuru | Silk | Handloom,Zari Work | Wedding,Festive | Silks known for motifs inspired by temples, animals and nature.
Guledgudd Khana | Silk-Cotton | Handloom | Ceremony,Contemporary | Khana is traditionally blouse fabric; these are saree adaptations. | inspired
Anekal Silk | Silk | Handloom | Festive | Silk sarees woven in the Anekal cluster near Bengaluru. | aka:Anekal
Kollegal Silk | Silk | Handloom | Festive | Silk sarees from the Kollegal weaving tradition.
Gandaberunda | Silk | Brocade | Wedding,Ceremony | Karnataka silk carrying the legendary double-headed eagle motif.
# Kerala ; South India ; India
Kerala Kasavu | Cotton | Handloom,Zari Work | Ceremony,Festive,Wedding | Off-white handloom cotton bordered with golden kasavu zari. | aka:Kasavu
Balaramapuram | Cotton | Handloom,Zari Work | Ceremony | Fine-count cotton handloom from near Thiruvananthapuram.
Kuthampully | Cotton | Handloom,Zari Work | Ceremony,Festive | Thrissur's handlooms, known for woven zari motifs on cream cotton.
Chendamangalam | Cotton | Handloom | Ceremony,Everyday | Handloom sarees with coloured borders from Ernakulam district.
Kannur Cotton | Cotton | Handloom | Everyday | Everyday handloom cotton from Kannur.
Kasaragod Cotton | Cotton | Handloom | Everyday | Light, durable cotton handloom sarees from Kasaragod. | aka:Kasargode
# Gujarat ; West India ; India
Patan Patola | Silk | Double Ikat | Wedding,Ceremony | Double-ikat silk from Patan — both directions dyed before weaving. | aka:Patola
Rajkot Patola | Silk | Ikat | Festive,Wedding | Single-ikat patola, more accessible yet richly patterned.
Gujarati Bandhani | Silk,Cotton,Georgette | Bandhani | Festive,Wedding | Thousands of tiny resist-dyed dots, tied by hand. | aka:Bandhej
Gharchola | Silk | Bandhani,Zari Work | Wedding | Bridal grid of zari squares filled with bandhani motifs.
Panetar | Silk | Bandhani | Wedding | White bridal saree with a red bandhani border.
Ashavali Brocade | Silk | Brocade | Wedding | Ahmedabad brocade with enamel-like floral motifs. | aka:Ashawali
Ajrakh Print | Cotton | Block Print | Everyday,Contemporary | Multi-stage resist block printing in indigo and madder tones.
Tangaliya-inspired | Cotton | Handloom | Contemporary | Contemporary designs drawing on Tangaliya dot-weaving. | inspired aka:Tangaliya
Mashru-inspired | Silk-Cotton | Handloom | Contemporary | Satin-faced weaves drawing on Mashru fabric. | inspired
Kuchchi Bhujodi | Cotton | Handloom,Mirror Work | Festive,Ceremony | Kutchi cotton saree of the Bhujodi tradition. | aka:Bhujodi,Kutch,Kuchchi
# Maharashtra ; West India ; India
Paithani | Silk | Brocade,Zari Work | Wedding,Festive | Tapestry-woven silk with peacock and lotus pallus.
Yeola Paithani | Silk | Brocade,Zari Work | Wedding | Paithani from the Yeola weaving cluster.
Nauvari Lugade | Cotton,Silk | Handloom | Ceremony,Festive | Nine-yard Maharashtrian drape; refers to style and length. | aka:Nauvari,Lugda,Lugade
Karvat Kathi | Silk-Cotton | Handloom,Temple Border | Ceremony | Saw-tooth temple borders woven in contrasting colours. | aka:Karvath Kati
Solapuri Cotton | Cotton | Handloom | Everyday | Regional cotton handloom from Solapur.
Himroo-inspired | Silk-Cotton | Brocade | Contemporary | Designs inspired by Aurangabad's Himroo weaves. | inspired aka:Himroo,Himroo Silk
Nagpur Cotton | Cotton | Handloom | Everyday | Everyday cotton handloom from Nagpur.
Raghvi | Silk-Cotton | Handloom | Festive | Soft silk-cotton saree from Maharashtra's weaving clusters.
Jyot Sari | Cotton | Handloom | Ceremony,Festive | Traditional Maharashtrian cotton saree. | aka:Jyot
# Rajasthan ; West India ; India
Leheriya | Chiffon,Georgette,Cotton | Leheriya | Festive,Summer | Diagonal wave patterns produced by rolling and resist-dyeing.
Rajasthani Bandhani | Georgette,Cotton | Bandhani | Festive | Tie-dyed sarees in vivid desert colours.
Kota Doria | Cotton,Silk-Cotton | Handloom | Summer,Office | Airy square-check khats woven in cotton and silk. | aka:Kota Masuria
Bagru Print | Cotton | Block Print | Everyday,Summer | Earthy hand-block prints using natural dyes and mud resist.
Sanganeri Print | Cotton | Block Print | Everyday,Office | Fine floral block prints on light backgrounds.
Dabu Print | Cotton | Block Print | Everyday | Mud-resist printing in indigo and earthy hues.
Gota Patti | Georgette,Chiffon | Gota Patti | Festive,Wedding | Metallic ribbon appliqué, traditionally from Jaipur.
Anwa | Cotton | Handloom | Everyday | Light cotton saree from Rajasthan's handloom clusters.
Pattu | Cotton | Handloom | Everyday,Ceremony | Pattu cotton saree woven in Rajasthan.
# Goa ; West India ; India
Kunbi | Cotton | Handloom | Everyday,Ceremony | Red-checked cotton drape of Goa's Kunbi community, now revived.
# West Bengal ; East India ; India
Baluchari | Silk | Brocade | Wedding,Festive | Silk pallus woven with narrative scenes from epics.
Swarnachari | Silk | Brocade,Zari Work | Wedding | Baluchari style worked in golden zari.
Bengal Tant | Cotton | Handloom | Everyday,Summer,Festive | Crisp, airy cotton with thick borders, made for humid summers. | aka:Tant
Bengal Jamdani | Cotton | Jamdani | Festive,Office | Floating motifs woven by hand on fine muslin-like cotton. | aka:Jamdani
Dhaniakhali | Cotton | Handloom | Everyday | Hooghly's durable cottons with striped borders.
Shantipuri | Cotton | Handloom,Jamdani | Festive | Fine cottons from Shantipur, Nadia. | aka:Santipuri
Tangail | Cotton | Jamdani | Festive | Light cotton with jamdani motifs; tradition shared with Bangladesh.
Garad | Silk | Handloom | Ceremony | Undyed silk with red borders, worn for pujas. | aka:Garad Korial
Korial | Silk | Handloom | Ceremony,Wedding | White or off-white silk with a red border and pallu. | aka:Garad Korial
Begumpuri | Cotton | Handloom | Everyday | Coarse, crisp cotton with contrast borders.
Murshidabad Silk | Silk | Handloom | Festive,Office | Light, smooth silk often used for printed sarees.
Bengal Tussar | Tussar | Handloom | Festive,Office | Golden wild silk from Bishnupur and surrounds.
Kantha Embroidered | Tussar,Silk | Kantha | Festive,Contemporary | Running-stitch embroidery layered across tussar or silk. | aka:Kantha,Kantha Silk
# Odisha ; East India ; India
Sambalpuri | Cotton,Silk | Ikat | Festive,Office | Bandha ikat with conch, wheel and flower motifs.
Bomkai | Silk,Cotton | Handloom,Brocade | Festive,Ceremony | Extra-weft motifs and fish borders. | aka:Sonepuri
Berhampuri Patta | Silk | Handloom,Temple Border | Wedding,Ceremony | Silk with temple borders, used in rituals and weddings. | aka:Berhampur Patta
Khandua | Silk | Ikat | Ceremony | Ikat silk historically associated with Jagannath temple.
Kotpad | Cotton | Handloom | Everyday | Tribal cotton dyed with aal (Indian madder) roots.
Habaspuri | Cotton | Handloom | Everyday | Kalahandi cotton with fish, temple and flower motifs.
Bichitrapuri | Silk,Cotton | Ikat | Festive | Ikat sarees with intricate border designs.
Nuapatna | Silk | Ikat | Ceremony | Ikat silks from Nuapatna, Cuttack district.
Pattachitra-inspired | Silk | Hand Painted | Contemporary | Hand-painted sarees inspired by Pattachitra scroll art. | inspired
Dongria-inspired | Cotton | Embroidery | Contemporary | Designs inspired by Dongria Kondh shawl embroidery. | inspired aka:Dongoria
Siminoi | Silk,Cotton | Handloom | Festive | Odisha handloom with traditional woven motifs.
Mayurbhanj | Cotton,Silk | Ikat | Festive | Ikat-influenced saree from Mayurbhanj district. | aka:Mayurbhanj Saree
Sachipar | Silk | Ikat | Ceremony | Odisha silk with ikat-derived patterning.
Gopalpur Tassar | Tussar | Handloom | Festive,Office | Tussar silk from Gopalpur, Odisha. | aka:Gopalpur Tussar
Biman | Cotton | Handloom | Everyday | Light cotton handloom from Odisha.
Nabakothi | Silk | Handloom,Brocade | Festive | Odisha silk with woven motifs.
Utakallaxmi | Cotton,Silk | Handloom | Ceremony | Odisha handloom saree of the Utakallaxmi tradition. | aka:Udayagiri
# Assam ; Northeast India ; India
Muga Silk | Muga | Handloom | Wedding,Ceremony | Naturally golden silk unique to Assam.
Eri Silk | Eri | Handloom | Everyday,Office | Warm, matte "peace silk" spun from open cocoons.
Pat Silk | Silk | Handloom | Ceremony,Festive | Bright white mulberry silk of Assam.
Sualkuchi Silk | Silk,Muga | Handloom | Festive | Silks from Sualkuchi, Assam's famed weaving village.
Assam Cotton | Cotton | Handloom | Everyday | Cotton handloom with Assamese motifs.
Mekhela Chador | Muga,Silk | Handloom | Ceremony,Wedding | A traditional Assamese two-piece ensemble — not a saree. | ensemble aka:Mekhela,Mekhela Chadar
# Bihar ; East India ; India
Bhagalpuri Silk | Tussar,Silk | Handloom | Office,Festive | Bhagalpur's tussar and silk, textured and earthy. | aka:Bhagalpuri,Bihar Tassar
Bawan Buti | Cotton | Butidar | Ceremony | Fifty-two woven buttis, a Nalanda handloom tradition.
Madhubani-painted | Tussar,Cotton | Hand Painted | Contemporary,Festive | Sarees carrying Madhubani painting — a contemporary application. | inspired
# Jharkhand ; East India ; India
Jharkhand Tussar | Tussar | Handloom | Office,Festive | Tussar from Jharkhand's forest-reared silkworms. | aka:Tassar
Jharkhand Gichha | Tussar | Handloom | Office,Festive | Gichha (ghicha) tussar yarn woven in Jharkhand. | aka:Gichha
# Chhattisgarh ; Central India ; India
Kosa Silk | Tussar | Handloom | Festive,Office | Kosa tussar from Champa and surrounding clusters.
Champa Silk | Tussar | Handloom | Festive | Tussar sarees woven in Champa. | aka:Tussar Silk of Champa
Gheecha Silk | Tussar | Handloom | Festive,Office | Gheecha (ghicha) tussar silk woven in Chhattisgarh. | aka:Ghicha,Gheecha
Bastar Mae Lugda | Cotton | Handloom | Everyday,Ceremony | Cotton lugda from the Bastar region.
# Uttar Pradesh ; North India ; India
Banarasi Silk | Silk | Brocade,Zari Work | Wedding,Festive | Varanasi's brocaded silks with dense zari motifs. | aka:Benarasi
Banarasi Katan | Silk | Brocade,Zari Work | Wedding | Pure silk katan base with heavy brocade.
Banarasi Organza | Organza | Brocade,Zari Work | Evening,Festive | Sheer organza with woven zari — lighter Banarasi.
Banarasi Georgette | Georgette | Brocade,Zari Work | Evening,Festive | Fluid georgette carrying Banarasi motifs.
Banarasi Tanchoi | Silk | Tanchoi | Festive,Evening | Satin weave with self-coloured patterns.
Jamdani-style Banarasi | Silk,Silk-Cotton | Jamdani | Festive | Banarasi weaving using jamdani motif techniques.
Lucknow Chikankari | Georgette,Cotton | Chikankari | Summer,Office,Festive | Fine white-work embroidery from Lucknow. | aka:Chikankari
Mau & Mubarakpur Silk | Silk | Handloom,Brocade | Festive | Silk weaving from the Mau and Mubarakpur clusters.
Satin Tanchoi Silk | Silk | Tanchoi | Festive,Evening | Satin-woven silk from Varanasi with self-coloured woven figures. | aka:Satin Tanchoi
Banarasi Jungla | Silk | Brocade | Festive | Varanasi silk with dense forest-and-animal motifs woven in zari. | aka:Jungla
Banarasi Shikargah | Silk | Brocade | Wedding | Varanasi silk carrying the shikargah hunting-scene motif. | aka:Shikargah
Banarasi Butidar | Silk | Butidar | Festive | Varanasi silk scattered with woven buti dots. | aka:Butidar Banarasi
Banarasi Cutwork | Silk-Cotton | Brocade,Cutwork | Festive,Evening | Banarasi base with openwork cut panels — lighter, with cutwork detail. | aka:Cutwork Banarasi
Banarasi Rangkat | Silk | Brocade | Festive | Varanasi silk with the rangkat woven-pattern finish.
Awad Jamdani | Silk-Cotton | Jamdani | Festive | Jamdani weaving of the Awad (Oudh) region, lighter than Bengal jamdani.
Nilambari | Cotton,Silk-Cotton | Handloom,Zari Work | Ceremony | Soft blue-toned handloom from Uttar Pradesh with a zari border.
Pitambari | Cotton,Silk-Cotton | Handloom,Zari Work | Ceremony,Wedding | Golden-yellow handloom saree of Uttar Pradesh with zari work.
Raktambari | Cotton,Silk-Cotton | Handloom,Zari Work | Ceremony,Festive | Deep red handloom saree of Uttar Pradesh with zari borders.
Swetambari | Cotton,Silk-Cotton | Handloom,Zari Work | Ceremony | Ivory-white handloom saree of Uttar Pradesh with subtle zari.
Mubarakpur Lachcha Buta | Silk | Brocade | Wedding,Festive | Silk with clustered buta motifs from Mubarakpur.
Meerut Lalitpur Zari Silk | Silk | Handloom,Zari Work | Festive | Zari-rich silk of the Meerut–Lalitpur tradition, related to Chanderi.
# Madhya Pradesh ; Central India ; India
Chanderi | Silk-Cotton | Handloom,Butidar,Zari Work | Office,Festive,Summer | Sheer, glossy silk-cotton with gold buttis.
Maheshwari | Silk-Cotton | Handloom | Office,Everyday | Reversible-border silk-cotton from Maheshwar.
Bagh Print | Cotton,Silk | Block Print | Everyday,Contemporary | Natural-dye block prints in red and black.
Madhya Pradesh Batik | Cotton | Batik | Contemporary | Wax-resist batik on cotton.
Baiga Chakdhariya | Cotton | Handloom | Ceremony,Everyday | Cotton saree associated with the Baiga community of Madhya Pradesh. | aka:Chakdhariya
# Punjab ; North India ; India
Phulkari-embroidered | Georgette,Chiffon | Phulkari | Festive,Wedding | Phulkari is traditionally an odhni; these are saree adaptations. | inspired
# Jammu & Kashmir ; North India ; India
Kashmiri Aari Embroidered | Georgette,Silk | Embroidery | Festive,Wedding | Hook-needle aari embroidery in Kashmiri floral motifs.
Dogri-inspired | Georgette | Embroidery | Ceremony | Ceremonial designs drawing on Dogra textiles. | inspired
Kani Pashmina | Silk | Kani Weave | Wedding,Ceremony | Pashmina woven with the kani technique — each motif built with small wooden bobbins. | aka:Kani
Ikat Pashmina | Silk | Ikat | Ceremony,Festive | Pashmina with ikat-dyed patterning.
# Uttarakhand ; North India ; India
Kumaoni Pichora-inspired | Georgette | Block Print | Ceremony | Ceremonial drapes inspired by the Kumaoni pichora. | inspired
Garhwali-inspired Drape | Cotton | Handloom | Ceremony | Contemporary drapes referencing Garhwali dress. | inspired
# Himachal Pradesh ; North India ; India
Himachali Handloom-inspired | Blended | Handloom | Contemporary | Wool-blend drapes with Kullu-style geometric borders. | inspired
# Tripura ; Northeast India ; India
Pachra-inspired | Cotton | Handloom | Contemporary | Drapes inspired by Tripuri pachra textiles. | inspired
# Manipur ; Northeast India ; India
Moirang Phee-inspired | Cotton | Handloom | Contemporary | Temple-tooth borders inspired by Moirang Phee. | inspired aka:Moirang Phee
# Nagaland ; Northeast India ; India
Naga-patterned | Cotton | Handloom | Contemporary | Bold stripes inspired by Naga shawls. | inspired
# Arunachal Pradesh ; Northeast India ; India
Apatani-inspired | Cotton | Handloom | Contemporary | Geometric motifs inspired by Apatani weaving. | inspired
# Meghalaya ; Northeast India ; India
Meghalaya Eri | Eri | Handloom | Everyday,Contemporary | Eri silk drapes from Ri-Bhoi and surrounding clusters.
# Mizoram ; Northeast India ; India
Puan-inspired | Cotton | Handloom | Contemporary | Designs referencing the Mizo puan. | inspired
# Sikkim ; Northeast India ; India
Lepcha-inspired | Cotton | Handloom | Contemporary | Stripes inspired by Lepcha weaving. | inspired
# Bangladesh ; South Asia ; Bangladesh
Dhakai Jamdani | Cotton | Jamdani | Festive,Wedding | UNESCO-recognised jamdani weaving of the Dhaka region.
Bangladeshi Tangail | Cotton | Jamdani | Festive,Everyday | Tangail district's light jamdani-style cottons.
Dhakai Muslin-inspired | Cotton | Handloom | Contemporary | Fine-count cotton inspired by legendary Dhaka muslin. | inspired
Rajshahi Silk | Silk | Handloom | Festive,Office | Silk from Rajshahi, northern Bangladesh.
Mirpur Benarasi | Silk | Brocade,Zari Work | Wedding | Benarasi-style weaving practised in Mirpur, Dhaka.
# Sri Lanka ; South Asia ; Sri Lanka
Kandyan Osariya | Silk,Cotton | Handloom | Wedding,Ceremony | Sri Lanka's Kandyan drape with a frilled waist.
Sri Lankan Batik Saree | Cotton | Batik | Contemporary,Summer | Wax-resist batik sarees made in Sri Lanka.
# Nepal ; South Asia ; Nepal
Nepali Festive Silk | Silk | Handloom | Festive | Festive silk sarees worn in Nepali style.
Dhaka-inspired Saree | Cotton | Handloom | Contemporary | Inspired by Nepal's Dhaka (patterned) textile. | inspired
# Pakistan ; South Asia ; Pakistan
Pakistani Embroidered Formal | Chiffon,Georgette | Zardozi,Embroidery | Evening,Wedding | Formal sarees with zardozi and resham embroidery.
Pakistani Banarasi-style | Silk | Brocade | Wedding | Banarasi-style brocade sarees.
# Indonesia ; Southeast Asia ; Indonesia
Kain Panjang | Cotton | Batik | Ceremony | Long batik cloth worn as a wrapped lower garment — not a saree. | drape
Batik Sarong | Cotton | Batik | Everyday | Tubular batik sarong worn across Indonesia — not a saree. | drape
# Malaysia ; Southeast Asia ; Malaysia
Songket | Silk | Brocade | Wedding,Ceremony | Handwoven brocade with metallic threads — not a saree. | drape
Malaysian Batik Sarong | Cotton | Batik | Everyday | Hand-drawn or block batik sarong — not a saree. | drape
# Cambodia ; Southeast Asia ; Cambodia
Sampot | Silk | Ikat | Ceremony | Cambodian wrapped lower garment — not a saree. | drape
# Laos ; Southeast Asia ; Laos
Sinh | Silk,Cotton | Handloom | Ceremony,Everyday | Lao tubular skirt with woven hem — not a saree. | drape
# Thailand ; Southeast Asia ; Thailand
Pha Nung | Silk | Handloom | Ceremony | Traditional Thai wrapped garment — not a saree. | drape
# Myanmar ; Southeast Asia ; Myanmar
Longyi | Cotton,Silk | Handloom | Everyday,Ceremony | Burmese sarong-style garment — not a saree. | drape
# Pan-India ; Central India ; India
Unverified Saree | Blended,Silk,Cotton | Handloom | Everyday,Contemporary | Contemporary or unverified saree awaiting curation and provenance verification. | inspired
`;

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function parse(): Variety[] {
  const out: Variety[] = [];
  let state = "", zone = "South India" as Zone, country = "India" as Country;
  for (const raw of RAW.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const [s, z, c] = line.slice(1).split(";").map((x) => x.trim());
      state = s; zone = z as Zone; country = c as Country;
      continue;
    }
    const [name, fabrics, techniques, occasions, blurb, flags = ""] = line.split("|").map((x) => x.trim());
    const aka = flags.match(/aka:([^|]+)/)?.[1].split(/[/,]/).map((x) => x.trim()).filter(Boolean) ?? [];
    const kind: GarmentKind = flags.includes("ensemble") ? "Ensemble" : flags.includes("drape") ? "Related Drape" : "Saree";
    const status: VarietyStatus = flags.includes("inspired") ? "inspired" : "established";
    out.push({
      slug: slugify(name), name, aliases: aka, state, country, zone, kind, status,
      fabrics: fabrics.split(",").map((x) => x.trim()) as FabricFamily[],
      techniques: techniques.split(",").map((x) => x.trim()) as Technique[],
      occasions: occasions.split(",").map((x) => x.trim()) as Occasion[],
      blurb,
    });
  }
  return out;
}

export const VARIETIES: Variety[] = parse();

/* ---------------------------------------------------------------------------
   Official "Pan-India Sarees of Handloom Sectors" compilation (Ministry of
   Textiles / Development Commissioner for Handlooms): 116 listed sarees across
   North, East, West and South zones. Each listed variety is tagged below with
   its compilation zone; the source table itself contains minor misplacements
   (e.g. Pitambari listed twice, Himroo under South), which we keep as published.
--------------------------------------------------------------------------- */
const OFFICIAL_ZONE_BY_SLUG: Record<string, HandloomZone> = {
  // North Zone
  "satin-tanchoi-silk": "North Zone", "banarasi-jungla": "North Zone", "banarasi-shikargah": "North Zone",
  "banarasi-butidar": "North Zone", "banarasi-cutwork": "North Zone", "banarasi-rangkat": "North Zone",
  "awad-jamdani": "North Zone", "nilambari": "North Zone", "pitambari": "North Zone", "raktambari": "North Zone",
  "swetambari": "North Zone", "mubarakpur-lachcha-buta": "North Zone", "meerut-lalitpur-zari-silk": "North Zone",
  "kani-pashmina": "North Zone", "ikat-pashmina": "North Zone", "kota-doria": "North Zone", "anwa": "North Zone",
  "pattu": "North Zone",
    // West Zone
  "paithani": "West Zone", "kunbi": "West Zone", "karvat-kathi": "West Zone",
  "nagpur-cotton": "West Zone", "raghvi": "West Zone", "jyot-sari": "West Zone", "nauvari-lugade": "West Zone",
  "maheshwari": "West Zone", "chanderi": "West Zone", "baiga-chakdhariya": "West Zone", "patan-patola": "West Zone",
  "rajkot-patola": "West Zone", "tangaliya-inspired": "West Zone", "ashavali-brocade": "West Zone",
  "kuchchi-bhujodi": "West Zone", "champa-silk": "West Zone", "gheecha-silk": "West Zone",
  "bastar-mae-lugda": "West Zone",
  // East Zone
  "bomkai": "East Zone", "habaspuri": "East Zone", "kotpad": "East Zone", "siminoi": "East Zone",
  "mayurbhanj": "East Zone", "bichitrapuri": "East Zone", "sachipar": "East Zone", "khandua": "East Zone",
  "gopalpur-tassar": "East Zone", "berhampuri-patta": "East Zone", "biman": "East Zone", "dongria-inspired": "East Zone",
  "nabakothi": "East Zone", "utakallaxmi": "East Zone", "muga-silk": "East Zone", "mekhela-chador": "East Zone",
  "bhagalpuri-silk": "East Zone", "bawan-buti": "East Zone", "bengal-jamdani": "East Zone", "baluchari": "East Zone",
  "santipuri": "East Zone", "shantipuri": "East Zone", "dhaniakhali": "East Zone", "tangail": "East Zone", "begumpuri": "East Zone",
  "garad": "East Zone", "korial": "East Zone", "kantha-embroidered": "East Zone", "jharkhand-tussar": "East Zone",
  "jharkhand-gichha": "East Zone", "moirang-phee-inspired": "East Zone",
  // South Zone
  "pochampally-ikat": "South Zone", "telia-rumal": "South Zone",
  "narayanpet": "South Zone", "gadwal": "South Zone", "siddipet-gollabhama": "South Zone", "armoor-silk": "South Zone",
  "himroo-inspired": "South Zone", "kothakota-silk": "South Zone", "mahadevpur-tassar": "South Zone",
  "linen-ikat": "South Zone", "muthyampeta-cotton": "South Zone", "ramappa": "South Zone",
  "uppada-jamdani": "South Zone", "venkatagiri": "South Zone", "chirala-cotton": "South Zone", "kuppadam": "South Zone",
  "dharmavaram-pattu": "South Zone", "madhavaram": "South Zone", "mangalagiri": "South Zone", "polavaram": "South Zone",
  "bobbili": "South Zone", "payakaraopet": "South Zone", "bandarulanka": "South Zone", "paturu-cotton-silk": "South Zone",
  "kanchipuram-silk": "South Zone", "kanchi-cotton": "South Zone", "arni-silk": "South Zone", "ponnur-cotton": "South Zone",
  "woraiyur-cotton": "South Zone", "madurai-sungudi": "South Zone", "karaikudi-kandangi": "South Zone",
  "paramakudi-cotton": "South Zone", "aruppukottai-cotton": "South Zone", "kodalikaruppur": "South Zone",
  "thirubuvanam-silk": "South Zone", "vilandai-cotton": "South Zone", "chedi-butta": "South Zone",
  "koorainadu": "South Zone", "kovai-cotton-silk": "South Zone", "salem-silk": "South Zone",
  "negamam-cotton": "South Zone", "molakalmuru": "South Zone", "ilkal": "South Zone", "gandaberunda": "South Zone",
  "anekal-silk": "South Zone", "balaramapuram": "South Zone", "kuthampully": "South Zone",
  "kasaragod-cotton": "South Zone", 
};

for (const v of VARIETIES) {
  const hz = OFFICIAL_ZONE_BY_SLUG[v.slug];
  if (hz) v.handloomZone = hz;
}

/** Varieties listed in the official Pan-India handloom-sector compilation. */
export const OFFICIAL_COMPILATION_COUNT = Object.keys(OFFICIAL_ZONE_BY_SLUG).length;
export const OFFICIAL_ZONES: HandloomZone[] = ["North Zone", "East Zone", "West Zone", "South Zone"];
export const varietyBySlug = (slug: string) => VARIETIES.find((v) => v.slug === slug);
export const varietyByName = (name: string) => VARIETIES.find((v) => v.name === name);

/* ------------------------------ Regions ------------------------------ */

const R = (name: string, zone: Zone, country: Country, tradition: string, story: string, image: number): RegionInfo =>
  ({ name, zone, country, tradition, story, image: img(image, 640, 800) });

export const REGIONS: RegionInfo[] = [
  R("Tamil Nadu", "South India", "India", "South Indian Silks", "Temple towns, korvai borders and the unmistakable weight of Kanchipuram silk.", IMG.modelSmile),
  R("Andhra Pradesh", "South India", "India", "Coastal Weaves", "Featherlight Uppada jamdani and crisp Mangalagiri cottons.", IMG.greenCorridor),
  R("Telangana", "South India", "India", "Ikat Country", "Pochampally's geometry, dyed thread by thread before the loom.", IMG.vibrant),
  R("Karnataka", "South India", "India", "Mysore & Ilkal", "Royal crepe silk and the kondi-joined pallus of Ilkal.", IMG.greenTemple2),
  R("Kerala", "South India", "India", "Kerala's Kasavu", "Ivory cotton and golden borders, worn for Onam and Vishu.", IMG.modelWhite),
  R("Gujarat", "West India", "India", "Gujarat's Vibrant Textiles", "Patola double ikat, bandhani dots and Ajrakh blocks.", IMG.dyeFactory),
  R("Maharashtra", "West India", "India", "Maharashtra's Paithani", "Peacock pallus and tapestry-woven silk from Paithan and Yeola.", IMG.purpleBrick),
  R("Rajasthan", "West India", "India", "Rajasthan's Tie-Dye", "Leheriya waves, bandhani and earthy Bagru blocks.", IMG.orangeMarket),
  R("Goa", "West India", "India", "Kunbi Revival", "The red-checked Kunbi drape, rediscovered.", IMG.redArchway),
  R("West Bengal", "East India", "India", "Bengal's Fine Weaves", "Baluchari stories, airy tant and floating jamdani motifs.", IMG.durgaPuja),
  R("Odisha", "East India", "India", "Odisha's Ikat Heritage", "Sambalpuri bandha, Bomkai and temple-born Khandua.", IMG.patterned),
  R("Assam", "Northeast India", "India", "Assam's Silk Traditions", "Golden muga, warm eri and the Mekhela Chador.", IMG.warmGlow),
  R("Bihar", "East India", "India", "Bhagalpur Tussar", "Textured tussar and the fifty-two buttis of Bawan Buti.", IMG.byTree),
  R("Jharkhand", "East India", "India", "Forest Tussar", "Wild silk reared in Jharkhand's sal forests.", IMG.forest),
  R("Chhattisgarh", "Central India", "India", "Kosa Silk", "Kosa and Champa tussar with a natural golden lustre.", IMG.ornateOutdoor),
  R("Uttar Pradesh", "North India", "India", "Royal Banarasi", "Varanasi brocades and Lucknow's chikankari white-work.", IMG.bridalCloseup),
  R("Madhya Pradesh", "Central India", "India", "Madhya Pradesh's Chanderi", "Sheer Chanderi and reversible Maheshwari borders.", IMG.studio),
  R("Punjab", "North India", "India", "Phulkari Adaptations", "Flower-work embroidery carried onto contemporary drapes.", IMG.twoBrides),
  R("Jammu & Kashmir", "North India", "India", "Kashmiri Aari", "Hook-needle embroidery in chinar and floral motifs.", IMG.floralEmb),
  R("Uttarakhand", "North India", "India", "Himalayan Inspirations", "Ceremonial references from Kumaon and Garhwal.", IMG.outdoorGrace),
  R("Himachal Pradesh", "North India", "India", "Kullu Geometry", "Wool-blend drapes with Himalayan borders.", IMG.brownPleat),
  R("Tripura", "Northeast India", "India", "Tripuri Textiles", "Contemporary drapes inspired by pachra.", IMG.villageLoom),
  R("Manipur", "Northeast India", "India", "Moirang Phee", "Temple-tooth borders reimagined.", IMG.threads),
  R("Nagaland", "Northeast India", "India", "Naga Stripes", "Bold stripes inspired by Naga shawls.", IMG.weaving),
  R("Arunachal Pradesh", "Northeast India", "India", "Apatani Geometry", "Motifs inspired by Apatani weaving.", IMG.handLoom),
  R("Meghalaya", "Northeast India", "India", "Meghalaya Eri", "Peace silk from Ri-Bhoi.", IMG.beigeLinen),
  R("Mizoram", "Northeast India", "India", "Mizo Puan", "Designs referencing the puan.", IMG.loom2),
  R("Sikkim", "Northeast India", "India", "Lepcha Stripes", "Contemporary stripes inspired by Lepcha weaving.", IMG.rolls),
  R("Bangladesh", "South Asia", "Bangladesh", "Dhakai Jamdani", "Jamdani, Tangail and the memory of Dhaka muslin.", IMG.bangladeshReading),
  R("Sri Lanka", "South Asia", "Sri Lanka", "Kandyan Osariya", "A frilled-waist drape and island batik.", IMG.goldSatin),
  R("Nepal", "South Asia", "Nepal", "Nepali Festive Silks", "Festive silks and Dhaka-patterned inspiration.", IMG.rolls),
  R("Pakistan", "South Asia", "Pakistan", "Formal Embroidery", "Zardozi-worked formal sarees.", IMG.blueSequin),
  R("Indonesia", "Southeast Asia", "Indonesia", "Batik & Kain Panjang", "Wax-resist cloth worn wrapped — a related tradition.", IMG.batikWomen),
  R("Malaysia", "Southeast Asia", "Malaysia", "Songket", "Metallic brocade — a related tradition.", IMG.malayCouple),
  R("Cambodia", "Southeast Asia", "Cambodia", "Sampot", "Wrapped silk ikat — a related tradition.", IMG.blueGoldSilk),
  R("Laos", "Southeast Asia", "Laos", "Sinh", "Woven tubular skirts — a related tradition.", IMG.threads),
  R("Thailand", "Southeast Asia", "Thailand", "Pha Nung", "Wrapped Thai garment — a related tradition.", IMG.goldFabric),
  R("Myanmar", "Southeast Asia", "Myanmar", "Longyi", "Burmese sarong-style garment — a related tradition.", IMG.greenLinen),
];

export const regionByName = (name: string) => REGIONS.find((r) => r.name === name);

export const ZONES: Zone[] = ["South India", "West India", "East India", "Northeast India", "North India", "Central India", "South Asia", "Southeast Asia"];

/* ------------------------------ Fabrics ------------------------------ */

export const FABRICS: { name: FabricFamily; note: string; image: string }[] = [
  { name: "Silk", note: "Mulberry, Kanchipuram, Banarasi, Mysore, katan. Pure silk is listed separately from art silk.", image: img(IMG.goldFabric, 520, 650) },
  { name: "Cotton", note: "Handloom, mulmul, tant, Chettinad and Kota — breathable everyday luxury.", image: img(IMG.beigeCotton, 520, 650) },
  { name: "Silk-Cotton", note: "Chanderi, Maheshwari, Gadwal — a blend, always labelled as such.", image: img(IMG.studio, 520, 650) },
  { name: "Linen", note: "Crisp, cool and modern; linen-cotton blends are labelled separately.", image: img(IMG.beigeLinen, 520, 650) },
  { name: "Organza", note: "Sheer and structured — often woven with Banarasi zari.", image: img(IMG.whiteFabric, 520, 650) },
  { name: "Chiffon", note: "Light and fluid; we state whether it is silk or synthetic.", image: img(IMG.poolside, 520, 650) },
  { name: "Georgette", note: "Grainy, flowing drape for evenings and embroidery.", image: img(IMG.blackPattern, 520, 650) },
  { name: "Crepe", note: "Matte, crinkled texture with a soft fall.", image: img(IMG.brownPleat, 520, 650) },
  { name: "Tussar", note: "Wild silk with a natural golden tone and slub.", image: img(IMG.warmGlow, 520, 650) },
  { name: "Muga", note: "Assam's naturally golden silk — rare and durable.", image: img(IMG.goldSatin, 520, 650) },
  { name: "Eri", note: "Matte 'peace silk', spun from vacated cocoons.", image: img(IMG.beigeFold, 520, 650) },
  { name: "Khadi", note: "Hand-spun and hand-woven — slow cloth by definition.", image: img(IMG.villageLoom, 520, 650) },
  { name: "Tissue", note: "Metallic-shot weaves with a luminous finish.", image: img(IMG.goldenTN, 520, 650) },
  { name: "Blended", note: "Viscose, rayon, modal and wool blends — composition always stated.", image: img(IMG.rolls, 520, 650) },
];

/* ----------------------------- Techniques ---------------------------- */

export const TECHNIQUE_GROUP: Record<Technique, TechniqueGroup> = {
  Handloom: "Weave", Ikat: "Weave", "Double Ikat": "Weave", Jamdani: "Weave", Brocade: "Weave",
  Tanchoi: "Weave", Butidar: "Weave", "Zari Work": "Weave", "Temple Border": "Weave",
  "Tie-Dye": "Print & Dye", Bandhani: "Print & Dye", Leheriya: "Print & Dye", "Block Print": "Print & Dye",
  Kalamkari: "Print & Dye", Batik: "Print & Dye", "Hand Painted": "Print & Dye",
  Embroidery: "Embroidery & Surface", Chikankari: "Embroidery & Surface", "Gota Patti": "Embroidery & Surface",
  Zardozi: "Embroidery & Surface", Kantha: "Embroidery & Surface", Phulkari: "Embroidery & Surface", "Mirror Work": "Embroidery & Surface",
  Cutwork: "Embroidery & Surface", "Kani Weave": "Weave",
};

export const CRAFT_STORIES: { slug: string; title: string; group: TechniqueGroup; technique: Technique; kicker: string; story: string; image: string }[] = [
  { slug: "handloom", title: "Handloom Weaving", group: "Weave", technique: "Handloom", kicker: "Thread by thread", story: "On a handloom, the weaver controls every pick of the weft by hand and foot. Slight irregularities are the signature of a human hand, not a flaw. A single silk saree can take from days to several weeks depending on density and motifs.", image: img(IMG.handLoom, 700, 560) },
  { slug: "ikat", title: "Ikat", group: "Weave", technique: "Ikat", kicker: "Dyed before woven", story: "In ikat, bundles of yarn are tied and dyed before weaving, so the pattern exists in the thread itself. Single ikat dyes either warp or weft; double ikat — as in Patan Patola — dyes both, requiring precise alignment on the loom.", image: img(IMG.patterned, 700, 560) },
  { slug: "jamdani", title: "Jamdani", group: "Weave", technique: "Jamdani", kicker: "Motifs that float", story: "Jamdani motifs are inserted by hand as supplementary weft while the cloth is woven, so they appear to float on fine cotton. Dhakai Jamdani is recognised by UNESCO as intangible cultural heritage.", image: img(IMG.bangladeshReading, 700, 560) },
  { slug: "brocade", title: "Brocade", group: "Weave", technique: "Brocade", kicker: "Woven gold", story: "Brocade uses extra weft threads — often zari — to build raised motifs into the fabric. Banarasi kadhua brocade weaves each motif separately, while fekua techniques float threads across the back.", image: img(IMG.bridalCloseup, 700, 560) },
  { slug: "tie-dye", title: "Tie-Dye", group: "Print & Dye", technique: "Bandhani", kicker: "Resist by hand", story: "Bandhani is made by pinching and tying tiny points of cloth before dyeing; Leheriya rolls and ties cloth diagonally to create waves. These are dyeing methods, applied after weaving.", image: img(IMG.orangeMarket, 700, 560) },
  { slug: "block-printing", title: "Block Printing", group: "Print & Dye", technique: "Block Print", kicker: "Carved wood, patient hands", story: "Hand-carved wooden blocks are dipped and pressed onto woven cloth. Bagru and Dabu use mud resists; Ajrakh involves many stages of resist and dyeing. Printing is a surface technique, distinct from weaving.", image: img(IMG.dyeFactory, 700, 560) },
  { slug: "kalamkari", title: "Kalamkari", group: "Print & Dye", technique: "Kalamkari", kicker: "Drawn with a pen", story: "Kalamkari — literally 'pen-work' — involves hand-drawing and painting with natural dyes, sometimes combined with block printing. It is a painted textile art, not a weave.", image: img(IMG.redFlat, 700, 560) },
  { slug: "embroidery", title: "Embroidery", group: "Embroidery & Surface", technique: "Embroidery", kicker: "Needle and thread", story: "Chikankari, Kantha, Zardozi, Aari and Phulkari are needle crafts worked onto finished cloth. We list embroidery separately so you always know what was woven and what was added after.", image: img(IMG.floralEmb, 700, 560) },
  { slug: "zari", title: "Zari Work", group: "Weave", technique: "Zari Work", kicker: "Metal and light", story: "Zari is metallic thread — historically silver or gold wrapped around silk, today often tested zari or metallic polyester. We state which type is used when the supplier has verified it.", image: img(IMG.goldFabric, 700, 560) },
  { slug: "borders", title: "Borders & Motifs", group: "Weave", technique: "Temple Border", kicker: "The frame of the drape", story: "Temple borders echo gopuram silhouettes; contrast borders are interlocked or woven separately; pallus carry the most elaborate work. Borders tell you as much about a saree's origin as its body.", image: img(IMG.greenTemple, 700, 560) },
];

/* ------------------------------ Occasions ---------------------------- */

export const OCCASION_INFO: { key: Occasion; label: string; caption: string; image: string; pos?: string }[] = [
  { key: "Wedding", label: "Bridal & Wedding", caption: "Kanchipuram, Banarasi, Paithani and heavy zari.", image: img(IMG.modelGrace, 900, 600), pos: "center 20%" },
  { key: "Festive", label: "Festivals & Celebrations", caption: "Silk, brocade, bandhani and patola.", image: img(IMG.diwali, 900, 600), pos: "center 55%" },
  { key: "Ceremony", label: "Traditional Ceremonies", caption: "Kasavu, Garad, Korial and temple silks.", image: img(IMG.keralaBride, 900, 600), pos: "center 30%" },
  { key: "Office", label: "Office & Workwear", caption: "Linen, Chanderi, soft silk, minimal prints.", image: img(IMG.blueIndoor, 700, 640), pos: "center 25%" },
  { key: "Everyday", label: "Everyday Wear", caption: "Cotton, khadi, lightweight handloom.", image: img(IMG.forest, 700, 640), pos: "center 25%" },
  { key: "Evening", label: "Parties & Evenings", caption: "Georgette, chiffon, organza and embellishment.", image: img(IMG.kolkataLights, 700, 640), pos: "center 30%" },
  { key: "Summer", label: "Lightweight Summer", caption: "Tant, Kota Doria, mulmul and leheriya.", image: img(IMG.keralaJasmine, 700, 640), pos: "center 30%" },
  { key: "Gifting", label: "Gifting", caption: "Heirloom-worthy pieces for the people you love.", image: img(IMG.motherDaughter, 700, 640), pos: "center 30%" },
  { key: "Contemporary", label: "Contemporary Styling", caption: "Inspired designs and modern drapes.", image: img(IMG.whiteBlack, 700, 640), pos: "center 25%" },
];

export const occasionLabel = (o: string) => OCCASION_INFO.find((x) => x.key === o)?.label ?? o;

/* ----------------------- Home: explore by tradition ------------------- */

export const TRADITIONS = [
  { title: "South Indian Silks", region: "Tamil Nadu · Karnataka · Andhra", text: "Korvai borders, temple motifs and gold.", image: img(IMG.modelSmile, 640, 800), to: "/shop?zone=South%20India&fabric=Silk&title=South%20Indian%20Silks" },
  { title: "Royal Banarasi", region: "Uttar Pradesh", text: "Varanasi's brocade heirlooms.", image: img(IMG.bridalCloseup, 640, 800), to: "/shop?q=Banarasi" },
  { title: "Bengal's Fine Weaves", region: "West Bengal", text: "Baluchari, tant and jamdani.", image: img(IMG.modelBlack, 640, 800), to: "/shop?state=West%20Bengal" },
  { title: "Gujarat's Vibrant Textiles", region: "Gujarat", text: "Patola, bandhani and Ajrakh.", image: img(IMG.dyeFactory, 640, 800), to: "/shop?state=Gujarat" },
  { title: "Maharashtra's Paithani", region: "Maharashtra", text: "Peacock pallus in tapestry silk.", image: img(IMG.modelGarden, 640, 800), to: "/shop?state=Maharashtra" },
  { title: "Odisha's Ikat Heritage", region: "Odisha", text: "Sambalpuri, Bomkai, Khandua.", image: img(IMG.patterned, 640, 800), to: "/shop?state=Odisha" },
  { title: "Assam's Silk Traditions", region: "Assam", text: "Golden muga and warm eri.", image: img(IMG.warmGlow, 640, 800), to: "/shop?state=Assam" },
  { title: "Rajasthan's Tie-Dye", region: "Rajasthan", text: "Leheriya, bandhani and Bagru.", image: img(IMG.orangeMarket, 640, 800), to: "/shop?state=Rajasthan" },
  { title: "Madhya Pradesh's Chanderi", region: "Madhya Pradesh", text: "Sheer silk-cotton with gold buttis.", image: img(IMG.studio, 640, 800), to: "/shop?state=Madhya%20Pradesh" },
  { title: "Kerala's Kasavu", region: "Kerala", text: "Ivory cotton, golden borders.", image: img(IMG.modelWhite, 640, 800), to: "/shop?state=Kerala" },
];

/** 20 featured saree types for the arched carousel. */
export const FEATURED_TYPES: { name: string; caption: string; image: string }[] = [
  ["Kanchipuram Silk", "Tamil Nadu", IMG.goldenTN], ["Banarasi Silk", "Uttar Pradesh", IMG.bridalCloseup],
  ["Mysore Silk", "Karnataka", IMG.greenTemple2], ["Paithani", "Maharashtra", IMG.purpleBrick],
  ["Patan Patola", "Gujarat", IMG.vibrant], ["Gujarati Bandhani", "Gujarat", IMG.redFlat],
  ["Chanderi", "Madhya Pradesh", IMG.studio], ["Maheshwari", "Madhya Pradesh", IMG.beigeFold],
  ["Pochampally Ikat", "Telangana", IMG.patterned], ["Sambalpuri", "Odisha", IMG.blackPattern],
  ["Bengal Jamdani", "West Bengal", IMG.whiteBlack], ["Kerala Kasavu", "Kerala", IMG.keralaJasmine],
  ["Baluchari", "West Bengal", IMG.redGoldSeated], ["Muga Silk", "Assam", IMG.goldSatin],
  ["Bengal Tussar", "West Bengal", IMG.warmGlow], ["Kota Doria", "Rajasthan", IMG.whiteFabric],
  ["Ilkal", "Karnataka", IMG.redArchway], ["Gadwal", "Telangana", IMG.ornateOutdoor],
  ["Venkatagiri", "Andhra Pradesh", IMG.greenCorridor], ["Uppada Jamdani", "Andhra Pradesh", IMG.tealFlat],
].map(([name, caption, id]) => ({ name: name as string, caption: caption as string, image: img(id as number, 520, 640) }));

/* -------------------- Beyond borders (international) ------------------ */

export const GLOBAL_TRADITIONS = [
  { country: "Bangladesh", kind: "Saree" as GarmentKind, items: "Jamdani · Tangail · Dhakai Muslin-inspired", image: img(IMG.bangladeshReading, 600, 720), to: "/shop?country=Bangladesh" },
  { country: "Sri Lanka", kind: "Saree" as GarmentKind, items: "Kandyan Osariya · batik sarees", image: img(IMG.goldSatin, 600, 720), to: "/shop?country=Sri%20Lanka" },
  { country: "Pakistan", kind: "Saree" as GarmentKind, items: "Embroidered formals · Banarasi-style", image: img(IMG.blueSequin, 600, 720), to: "/shop?country=Pakistan" },
  { country: "Nepal", kind: "Saree" as GarmentKind, items: "Festive silks · Dhaka-inspired", image: img(IMG.rolls, 600, 720), to: "/shop?country=Nepal" },
  { country: "Indonesia", kind: "Related Drape" as GarmentKind, items: "Batik · Kain Panjang", image: img(IMG.batikWomen, 600, 720), to: "/shop?country=Indonesia" },
  { country: "Malaysia", kind: "Related Drape" as GarmentKind, items: "Songket · batik sarong", image: img(IMG.malayCouple, 600, 720), to: "/shop?country=Malaysia" },
  { country: "Cambodia", kind: "Related Drape" as GarmentKind, items: "Sampot", image: img(IMG.blueGoldSilk, 600, 720), to: "/collections#southeast-asia" },
  { country: "Laos", kind: "Related Drape" as GarmentKind, items: "Sinh", image: img(IMG.threads, 600, 720), to: "/collections#southeast-asia" },
  { country: "Thailand", kind: "Related Drape" as GarmentKind, items: "Pha Nung", image: img(IMG.goldFabric, 600, 720), to: "/collections#southeast-asia" },
  { country: "Myanmar", kind: "Related Drape" as GarmentKind, items: "Longyi", image: img(IMG.greenLinen, 600, 720), to: "/collections#southeast-asia" },
];

/* ------------------------------ Store policy ---------------------------- */
/** Configurable policy — UI only shows claims that are configured here. */
export const STORE_POLICY = {
  freeShippingThreshold: 2999 as number | null,
  flatShipping: 99,
  returnWindowDays: 7 as number | null,
  supportEmail: "care@shopscale.example",
  supportPhone: "+91 80 0000 0000",
  isDemo: true,
};