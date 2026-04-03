import {
  Circle,
  Defs,
  Document,
  Image,
  LinearGradient,
  Link,
  Page,
  Path,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CertificatePresentation } from "@/lib/certificate-presenter";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#050b18",
    padding: 24,
    fontFamily: "Helvetica",
  },
  shell: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#1d2c49",
    backgroundColor: "#0b1327",
    paddingTop: 42,
    paddingRight: 42,
    paddingBottom: 38,
    paddingLeft: 42,
  },
  shellInset: {
    position: "absolute",
    top: 14,
    right: 14,
    bottom: 14,
    left: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#243453",
  },
  orbOne: {
    position: "absolute",
    top: -120,
    right: -30,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    opacity: 0.16,
  },
  orbTwo: {
    position: "absolute",
    bottom: -140,
    left: -70,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "#18233b",
    opacity: 0.75,
  },
  brandWrap: {
    alignItems: "center",
  },
  brandText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 4,
    color: "#8db4ff",
  },
  eyebrow: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 3.2,
    color: "#6ea2ff",
  },
  title: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 46,
    fontWeight: 800,
    lineHeight: 50,
    color: "#ffffff",
  },
  bodyWrap: {
    marginTop: 34,
    alignItems: "center",
  },
  bodyLabel: {
    fontSize: 15,
    lineHeight: 21,
    color: "#dce6ff",
  },
  recipient: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 38,
    color: "#ffffff",
  },
  completionStatement: {
    marginTop: 16,
    maxWidth: 470,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 25,
    color: "#d7e0f6",
  },
  footer: {
    marginTop: 46,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 24,
  },
  metaItem: {
    marginBottom: 18,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.6,
    color: "#7aa6ff",
  },
  metaValue: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 23,
    color: "#ffffff",
  },
  metaValueMono: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Courier",
    lineHeight: 18,
    color: "#ffffff",
  },
  signatureBlock: {
    marginTop: 14,
    width: 220,
  },
  signatureText: {
    fontSize: 24,
    fontStyle: "italic",
    color: "#ffffff",
  },
  signatureLine: {
    marginTop: 4,
    height: 1,
    backgroundColor: "#dce6ff",
    opacity: 0.65,
  },
  signatureLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#d7e0f6",
  },
  footerRight: {
    width: 214,
    flexShrink: 0,
    alignItems: "center",
  },
  qrFrame: {
    width: 182,
    height: 182,
    padding: 12,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrTitle: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
  },
  qrBody: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    color: "#d7e0f6",
  },
  verifyLink: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 15,
    color: "#8db4ff",
    textDecoration: "none",
  },
});

function CertificateLogo() {
  return (
    <Svg width={82} height={82} viewBox="0 0 82 82">
      <Defs>
        <LinearGradient id="certificateLogoGradient" x1="8" y1="10" x2="74" y2="72">
          <Stop offset="0%" stopColor="#8db4ff" />
          <Stop offset="100%" stopColor="#2563eb" />
        </LinearGradient>
      </Defs>
      <Circle cx="41" cy="41" r="35" stroke="url(#certificateLogoGradient)" strokeWidth="4" fill="#0f172a" />
      <Circle cx="41" cy="41" r="27" stroke="#34538a" strokeWidth="1.5" fill="#101a31" />
      <Path
        d="M30 52 L37 29 L41 29 L35 52 Z"
        fill="#ffffff"
      />
      <Path
        d="M45 52 L45 29 L54 29 C58 29 61 31.5 61 35.5 C61 38.2 59.5 40.4 57 41.5 C60.1 42.5 62 45 62 48.4 C62 53 58.2 56 52.7 56 L45 56 Z M49 39.4 L53 39.4 C55.2 39.4 56.8 38.1 56.8 35.9 C56.8 33.8 55.4 32.5 53.1 32.5 L49 32.5 Z M49 52.4 L52.7 52.4 C55.8 52.4 57.8 50.8 57.8 48.1 C57.8 45.4 55.9 43.8 52.7 43.8 L49 43.8 Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

export function createCertificatePdfDocument(certificate: CertificatePresentation) {
  return (
    <Document
      title={`Certificate of Completion - ${certificate.recipientName}`}
      author="AI Learning Class"
      subject={`Official learning credential for ${certificate.courseTitle}`}
      creator="AI Learning Class"
      producer="AI Learning Class"
      creationDate={new Date()}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.shellInset} />
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />

          <View style={styles.brandWrap}>
            <CertificateLogo />
            <Text style={styles.brandText}>AI Learning Class</Text>
          </View>

          <Text style={styles.eyebrow}>OFFICIAL LEARNING CREDENTIAL</Text>
          <Text style={styles.title}>Certificate of Completion</Text>

          <View style={styles.bodyWrap}>
            <Text style={styles.bodyLabel}>This certifies that</Text>
            <Text style={styles.recipient}>{certificate.recipientName}</Text>
            <Text style={styles.completionStatement}>{certificate.completionStatement}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Credential Code</Text>
                <Text style={styles.metaValueMono}>{certificate.code}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Issued Date</Text>
                <Text style={styles.metaValue}>{certificate.issuedLabel}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Lifetime Status</Text>
                <Text style={styles.metaValue}>{certificate.statusLabel}</Text>
              </View>

              <View style={styles.signatureBlock}>
                <Text style={styles.signatureText}>AI Learning Class</Text>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Admin Signature</Text>
              </View>
            </View>

            <View style={styles.footerRight}>
              <View style={styles.qrFrame}>
                <Image src={certificate.qrDataUrl} style={styles.qrImage} />
              </View>
              <Text style={styles.qrTitle}>Scan to Verify</Text>
              <Text style={styles.qrBody}>
                Employers and teams can validate this credential online.
              </Text>
              <Link href={certificate.verifyUrl} style={styles.verifyLink}>
                {certificate.verifyDisplayUrl}
              </Link>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function CertificatePdfDocument({ certificate }: { certificate: CertificatePresentation }) {
  return createCertificatePdfDocument(certificate);
}
