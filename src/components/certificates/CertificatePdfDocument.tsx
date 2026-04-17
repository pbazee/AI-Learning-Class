import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CertificatePresentation } from "@/lib/certificate-presenter";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#071121",
    padding: 26,
    fontFamily: "Helvetica",
  },
  shell: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1c3156",
    borderRadius: 28,
    backgroundColor: "#0b1730",
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 30,
    paddingLeft: 34,
  },
  badge: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#2f4f86",
    borderRadius: 999,
    paddingTop: 6,
    paddingRight: 16,
    paddingBottom: 6,
    paddingLeft: 16,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.3,
    color: "#8db4ff",
  },
  title: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 34,
    fontWeight: 700,
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    color: "#d7e0f6",
  },
  recipientLabel: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 13,
    color: "#d7e0f6",
  },
  recipient: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 28,
    fontWeight: 700,
    color: "#ffffff",
  },
  statement: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: "#d7e0f6",
  },
  grid: {
    marginTop: 28,
    flexDirection: "row",
    gap: 18,
  },
  panel: {
    flexGrow: 1,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: "#243a63",
    borderRadius: 18,
    backgroundColor: "#0f1d3a",
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.8,
    color: "#8db4ff",
  },
  panelValueMono: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Courier",
    color: "#ffffff",
  },
  panelValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
  },
  qrPanel: {
    width: 180,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "#243a63",
    borderRadius: 18,
    backgroundColor: "#0f1d3a",
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    alignItems: "center",
  },
  qrFrame: {
    width: 132,
    height: 132,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrTitle: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 700,
    color: "#ffffff",
  },
  qrBody: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 15,
    color: "#d7e0f6",
  },
  verifyUrl: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 9.5,
    color: "#8db4ff",
  },
  signatureWrap: {
    marginTop: 26,
  },
  signatureText: {
    fontSize: 22,
    fontStyle: "italic",
    color: "#ffffff",
  },
  signatureLine: {
    marginTop: 4,
    height: 1,
    backgroundColor: "#d7e0f6",
  },
  signatureLabel: {
    marginTop: 8,
    fontSize: 11,
    color: "#d7e0f6",
  },
});

export function createCertificatePdfDocument(certificate: CertificatePresentation) {
  return (
    <Document
      title={`Certificate of Completion - ${certificate.recipientName}`}
      author="AI GENIUS LAB"
      subject={`Official learning credential for ${certificate.courseTitle}`}
      creator="AI GENIUS LAB"
      producer="AI GENIUS LAB"
      creationDate={new Date()}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <Text style={styles.badge}>OFFICIAL LEARNING CREDENTIAL</Text>
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>AI GENIUS LAB</Text>

          <Text style={styles.recipientLabel}>This certifies that</Text>
          <Text style={styles.recipient}>{certificate.recipientName}</Text>
          <Text style={styles.statement}>{certificate.completionStatement}</Text>

          <View style={styles.grid}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Credential Code</Text>
              <Text style={styles.panelValueMono}>{certificate.code}</Text>

              <Text style={[styles.panelTitle, { marginTop: 18 }]}>Issued Date</Text>
              <Text style={styles.panelValue}>{certificate.issuedLabel}</Text>

              <Text style={[styles.panelTitle, { marginTop: 18 }]}>Lifetime Status</Text>
              <Text style={styles.panelValue}>{certificate.statusLabel}</Text>

              <View style={styles.signatureWrap}>
                <Text style={styles.signatureText}>AI GENIUS LAB</Text>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Admin Signature</Text>
              </View>
            </View>

            <View style={styles.qrPanel}>
              <View style={styles.qrFrame}>
                <Image src={certificate.qrDataUrl} style={styles.qrImage} />
              </View>
              <Text style={styles.qrTitle}>Scan to Verify</Text>
              <Text style={styles.qrBody}>
                Employers and teams can validate this credential online.
              </Text>
              <Text style={styles.verifyUrl}>{certificate.verifyDisplayUrl}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function CertificatePdfDocument({
  certificate,
}: {
  certificate: CertificatePresentation;
}) {
  return createCertificatePdfDocument(certificate);
}

